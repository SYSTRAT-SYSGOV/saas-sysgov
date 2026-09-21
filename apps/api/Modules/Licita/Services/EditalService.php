<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Licita\Enums\StatusEdital;
use Modules\Licita\Models\Edital;
use Modules\Licita\Models\Processo;
use Modules\Licita\Models\Tr;
use Modules\Licita\Support\HtmlSanitizer;

final class EditalService
{
    private const CAMPOS_DIFF = [
        'equipe_planejamento',
        'preambulo',
        'objeto',
        'criterio_julgamento',
        'condicoes_participacao',
        'requisitos_habilitacao',
        'procedimento_sessao_publica',
        'prazo_recursal',
        'sancoes_administrativas',
        'disposicoes_gerais',
        'campos_extras',
    ];

    /** Colunas de seção que aceitam HTML rico do TinyMCE (ver sanitizarCamposRicos) — `criterio_julgamento` é um enum (seleção), não texto. */
    private const CAMPOS_RICOS = [
        'preambulo',
        'objeto',
        'condicoes_participacao',
        'requisitos_habilitacao',
        'procedimento_sessao_publica',
        'prazo_recursal',
        'sancoes_administrativas',
        'disposicoes_gerais',
    ];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
        private readonly CampoConfiguracaoService $camposConfiguracao,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public function criar(Processo $processo, array $data, User $user): Edital
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação do Edital.');
        }

        // RN-002: o Edital só existe depois de haver um Termo de Referência
        // (não precisa estar aprovado — mesmo raciocínio das fases
        // anteriores, ver TrService::criar).
        $tr = $processo->tr;
        if ($tr === null) {
            throw new DomainException('Cadastre o Termo de Referência deste processo antes de iniciar o Edital.');
        }

        if ($processo->edital()->exists()) {
            throw new DomainException('Este processo já possui um Edital. Edite o existente em vez de criar outro.');
        }

        $data = $this->sanitizarCamposRicos($data);
        $data = $this->preencherCopiasDeFasesAnteriores($data, $processo, $tr);

        // Validado só depois das cópias acima (equipe/objeto/critério de
        // julgamento/sanções) — mesmo raciocínio do TrService/EtpService: um
        // tenant que marque um desses campos como obrigatório não deve
        // travar a criação por causa de um valor que o próprio sistema já
        // ia preencher a partir do DFD/TR.
        $this->camposConfiguracao->validarRespostas('edital', [
            ...$this->valoresNativos($data),
            ...($data['campos_extras'] ?? []),
        ]);

        return DB::transaction(function () use ($processo, $data, $user): Edital {
            $edital = Edital::create([
                ...$data,
                'processo_id' => $processo->id,
                'status' => StatusEdital::Rascunho->value,
                'elaborado_por' => $user->id,
            ]);

            $this->registrarVersao($edital, 'criado', $user);
            $this->audit->record('licita', 'edital.criado', "Edital #{$edital->id}", null, $edital->toArray());
            $this->outbox->publish('licita.EditalCriado', ['id' => $edital->id, 'processo_id' => $processo->id]);

            return $edital->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function atualizar(Edital $edital, array $data, User $user): Edital
    {
        if ($edital->statusEnum()->is(StatusEdital::Aprovado)) {
            throw new DomainException('Edital aprovado é imutável — a aprovação final do processo já travou este documento.');
        }

        $camposExtras = array_key_exists('campos_extras', $data) ? $data['campos_extras'] : ($edital->campos_extras ?? []);
        $this->camposConfiguracao->validarRespostas('edital', [
            ...$this->valoresNativos($data, $edital),
            ...($camposExtras ?? []),
        ]);
        $data = $this->sanitizarCamposRicos($data);

        return DB::transaction(function () use ($edital, $data, $user): Edital {
            $antes = $edital->toArray();
            $edital->update(array_intersect_key($data, array_flip(self::CAMPOS_DIFF)));
            $edital->refresh();
            $diff = $this->calcularDiff($antes, $edital->toArray());

            if ($diff !== []) {
                $this->registrarVersao($edital, 'revisado', $user, $diff);
                $this->audit->record('licita', 'edital.revisado', "Edital #{$edital->id}", $antes, $edital->toArray());
                $this->outbox->publish('licita.EditalRevisado', ['id' => $edital->id, 'campos' => array_keys($diff)]);
            }

            return $edital->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * Pré-preenche, só na criação, o que já foi elaborado nas fases
     * anteriores — evita o órgão redigitar do zero o que o TR/DFD já têm:
     * equipe de planejamento e critério de julgamento/sanções administrativas
     * do TR (mesmas seções, texto idêntico ao publicado no TR), objeto do
     * DFD (ou do processo, se o DFD não tiver um preenchido). Cada campo só
     * é copiado se o request não trouxe um valor próprio — o elaborador pode
     * sempre sobrescrever antes mesmo de salvar a primeira vez. Depois de
     * criado, o Edital é totalmente independente: editar TR/DFD depois não
     * reflete de volta aqui (mesmo espírito de equipe_planejamento em
     * TR/EtpService::criar).
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function preencherCopiasDeFasesAnteriores(array $data, Processo $processo, Tr $tr): array
    {
        if (!array_key_exists('equipe_planejamento', $data) || $data['equipe_planejamento'] === null) {
            $data['equipe_planejamento'] = $tr->equipe_planejamento;
        }
        if (!array_key_exists('objeto', $data) || $data['objeto'] === null || $data['objeto'] === '') {
            $data['objeto'] = $processo->dfd === null ? $processo->objeto : ($processo->dfd->objeto ?? $processo->objeto);
        }
        if (!array_key_exists('criterio_julgamento', $data) || $data['criterio_julgamento'] === null) {
            $data['criterio_julgamento'] = $tr->criterio_julgamento;
        }
        if (!array_key_exists('sancoes_administrativas', $data) || $data['sancoes_administrativas'] === null || $data['sancoes_administrativas'] === '') {
            $data['sancoes_administrativas'] = $tr->sancoes_administrativas;
        }

        return $data;
    }

    /**
     * Monta, para validarRespostas, o valor atual de cada seção nativa
     * configurável do Edital — o que está em `$data` e, faltando lá, o que
     * já está salvo em `$edital` (update parcial) ou `null` (criação, já
     * depois das cópias de preencherCopiasDeFasesAnteriores). Mesmo
     * raciocínio do TrService::valoresNativos.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function valoresNativos(array $data, ?Edital $edital = null): array
    {
        $campos = [
            'preambulo', 'objeto', 'criterio_julgamento', 'condicoes_participacao',
            'requisitos_habilitacao', 'procedimento_sessao_publica', 'prazo_recursal',
            'sancoes_administrativas', 'disposicoes_gerais', 'equipe_planejamento',
        ];
        $valores = [];
        foreach ($campos as $campo) {
            $valores[$campo] = array_key_exists($campo, $data) ? $data[$campo] : $edital?->{$campo};
        }

        return $valores;
    }

    /**
     * Sanitiza as seções que aceitam HTML rico do TinyMCE (e os
     * campos_extras do tipo texto_longo) antes de persistir — defesa
     * contra XSS armazenado, mesma lógica do TrService/EtpService/DfdService.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function sanitizarCamposRicos(array $data): array
    {
        foreach (self::CAMPOS_RICOS as $campo) {
            if (isset($data[$campo]) && is_string($data[$campo])) {
                $data[$campo] = $this->sanitizer->sanitize($data[$campo]);
            }
        }

        if (array_key_exists('campos_extras', $data) && is_array($data['campos_extras'])) {
            $config = $this->camposConfiguracao->getAtiva('edital');
            $textoLongoKeys = $config === null
                ? []
                : array_column(array_filter($config->campos, fn ($c) => $c['tipo'] === 'texto_longo'), 'key');

            foreach ($textoLongoKeys as $key) {
                if (isset($data['campos_extras'][$key]) && is_string($data['campos_extras'][$key])) {
                    $data['campos_extras'][$key] = $this->sanitizer->sanitize($data['campos_extras'][$key]);
                }
            }
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $antes
     * @param array<string, mixed> $depois
     * @return array<string, array{de: mixed, para: mixed}>
     */
    private function calcularDiff(array $antes, array $depois): array
    {
        $diff = [];

        foreach (self::CAMPOS_DIFF as $campo) {
            $de = $antes[$campo] ?? null;
            $para = $depois[$campo] ?? null;

            if ($de !== $para) {
                $diff[$campo] = ['de' => $de, 'para' => $para];
            }
        }

        return $diff;
    }

    /**
     * @param array<string, mixed> $camposAlterados
     */
    private function registrarVersao(Edital $edital, string $acao, User $user, array $camposAlterados = []): void
    {
        $proxima = ((int) $edital->versoes()->max('versao')) + 1;

        $edital->versoes()->create([
            'versao' => $proxima,
            'acao' => $acao,
            'campos_alterados' => $camposAlterados !== [] ? $camposAlterados : null,
            'dados' => $edital->toArray(),
            'user_id' => $user->id,
        ]);
    }
}

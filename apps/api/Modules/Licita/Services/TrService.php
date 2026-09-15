<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Licita\Enums\StatusTr;
use Modules\Licita\Models\Processo;
use Modules\Licita\Models\Tr;
use Modules\Licita\Support\HtmlSanitizer;

final class TrService
{
    private const CAMPOS_DIFF = [
        'equipe_planejamento',
        'fundamentacao_contratacao',
        'descricao_solucao',
        'requisitos_contratacao',
        'modelo_execucao',
        'modelo_gestao_contrato',
        'criterio_julgamento',
        'obrigacoes_contratante',
        'obrigacoes_contratada',
        'sancoes_administrativas',
        'vigencia_contrato',
        'adequacao_orcamentaria',
        'campos_extras',
    ];

    /** Colunas de seção que aceitam HTML rico do TinyMCE (ver sanitizarCamposRicos). */
    private const CAMPOS_RICOS = [
        'fundamentacao_contratacao',
        'descricao_solucao',
        'requisitos_contratacao',
        'modelo_execucao',
        'modelo_gestao_contrato',
        'obrigacoes_contratante',
        'obrigacoes_contratada',
        'sancoes_administrativas',
        'adequacao_orcamentaria',
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
    public function criar(Processo $processo, array $data, User $user): Tr
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação do Termo de Referência.');
        }

        // RN-002: o TR só existe depois de haver uma Pesquisa de Preços
        // (não precisa mais estar aprovada — ver comentário equivalente em
        // EtpService::criar).
        $pesquisaPreco = $processo->pesquisaPreco;
        if ($pesquisaPreco === null) {
            throw new DomainException('Cadastre a Pesquisa de Preços deste processo antes de iniciar o Termo de Referência.');
        }

        if ($processo->tr()->exists()) {
            throw new DomainException('Este processo já possui um Termo de Referência. Edite o existente em vez de criar outro.');
        }

        $this->camposConfiguracao->validarRespostas('tr', $data['campos_extras'] ?? []);
        $data = $this->sanitizarCamposRicos($data);

        // Equipe de planejamento nasce como cópia da equipe já cadastrada na
        // Pesquisa de Preços do mesmo processo — mesmo raciocínio das fases
        // anteriores — mas fica num campo próprio, editável dali em diante
        // independentemente da Pesquisa de Preços.
        if (!array_key_exists('equipe_planejamento', $data) || $data['equipe_planejamento'] === null) {
            $data['equipe_planejamento'] = $pesquisaPreco->equipe_planejamento;
        }

        return DB::transaction(function () use ($processo, $data, $user): Tr {
            $tr = Tr::create([
                ...$data,
                'processo_id' => $processo->id,
                'status' => StatusTr::Rascunho->value,
                'elaborado_por' => $user->id,
            ]);

            $this->registrarVersao($tr, 'criado', $user);
            $this->audit->record('licita', 'tr.criado', "Tr #{$tr->id}", null, $tr->toArray());
            $this->outbox->publish('licita.TrCriado', ['id' => $tr->id, 'processo_id' => $processo->id]);

            return $tr->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function atualizar(Tr $tr, array $data, User $user): Tr
    {
        if ($tr->statusEnum()->is(StatusTr::Aprovado)) {
            throw new DomainException('Termo de Referência aprovado é imutável — a aprovação final do processo já travou este documento.');
        }

        $camposExtras = array_key_exists('campos_extras', $data) ? $data['campos_extras'] : ($tr->campos_extras ?? []);
        $this->camposConfiguracao->validarRespostas('tr', $camposExtras ?? []);
        $data = $this->sanitizarCamposRicos($data);

        return DB::transaction(function () use ($tr, $data, $user): Tr {
            $antes = $tr->toArray();
            $tr->update(array_intersect_key($data, array_flip(self::CAMPOS_DIFF)));
            $tr->refresh();
            $diff = $this->calcularDiff($antes, $tr->toArray());

            if ($diff !== []) {
                $this->registrarVersao($tr, 'revisado', $user, $diff);
                $this->audit->record('licita', 'tr.revisado', "Tr #{$tr->id}", $antes, $tr->toArray());
                $this->outbox->publish('licita.TrRevisado', ['id' => $tr->id, 'campos' => array_keys($diff)]);
            }

            return $tr->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * Sanitiza as seções que aceitam HTML rico do TinyMCE (e os
     * campos_extras do tipo texto_longo) antes de persistir — defesa
     * contra XSS armazenado, mesma lógica do DfdService/EtpService/MapaRiscoService.
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
            $config = $this->camposConfiguracao->getAtiva('tr');
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
    private function registrarVersao(Tr $tr, string $acao, User $user, array $camposAlterados = []): void
    {
        $proxima = ((int) $tr->versoes()->max('versao')) + 1;

        $tr->versoes()->create([
            'versao' => $proxima,
            'acao' => $acao,
            'campos_alterados' => $camposAlterados !== [] ? $camposAlterados : null,
            'dados' => $tr->toArray(),
            'user_id' => $user->id,
        ]);
    }
}

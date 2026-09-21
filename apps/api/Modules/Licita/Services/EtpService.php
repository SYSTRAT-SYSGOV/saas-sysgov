<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Licita\Enums\StatusEtp;
use Modules\Licita\Models\Etp;
use Modules\Licita\Models\Processo;
use Modules\Licita\Support\HtmlSanitizer;

final class EtpService
{
    private const CAMPOS_DIFF = [
        'conteudo',
        'equipe_planejamento',
        'campos_extras',
        'gerado_por_ia',
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
    public function criar(Processo $processo, array $data, User $user): Etp
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação do ETP.');
        }

        // RN-002: o ETP só existe depois de haver um DFD (não precisa mais
        // estar aprovado — a partir do DFD aprovado, a equipe de
        // planejamento edita ETP/Mapa de Riscos/Pesquisa de Preços livremente
        // e em qualquer ordem; a única aprovação formal que resta é a final,
        // do Ordenador, ver AprovacaoFinalService).
        $dfd = $processo->dfd;
        if ($dfd === null) {
            throw new DomainException('Cadastre o DFD deste processo antes de iniciar o ETP.');
        }

        if ($processo->etp()->exists()) {
            throw new DomainException('Este processo já possui um ETP. Edite o existente em vez de criar outro.');
        }

        $data = $this->sanitizarCamposRicos($data);

        // Equipe de planejamento nasce como cópia da equipe já cadastrada no
        // DFD do mesmo processo — evita recadastro e mantém consistência no
        // início — mas fica num campo próprio do ETP, editável dali em
        // diante independentemente do DFD (não é uma referência viva).
        if (!array_key_exists('equipe_planejamento', $data) || $data['equipe_planejamento'] === null) {
            $data['equipe_planejamento'] = $dfd->equipe_planejamento;
        }

        // Validado só depois do preenchimento automático da equipe acima —
        // mesmo raciocínio do TrService::criar.
        $this->camposConfiguracao->validarRespostas('etp', [
            ...$this->valoresNativos($data),
            ...($data['campos_extras'] ?? []),
        ]);

        return DB::transaction(function () use ($processo, $data, $user): Etp {
            $etp = Etp::create([
                ...$data,
                'processo_id' => $processo->id,
                'status' => StatusEtp::Rascunho->value,
                'elaborado_por' => $user->id,
            ]);

            $this->registrarVersao($etp, 'criado', $user);
            $this->audit->record('licita', 'etp.criado', "Etp #{$etp->id}", null, $etp->toArray());
            $this->outbox->publish('licita.EtpCriado', ['id' => $etp->id, 'processo_id' => $processo->id]);

            return $etp->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function atualizar(Etp $etp, array $data, User $user): Etp
    {
        if ($etp->statusEnum()->is(StatusEtp::Aprovado)) {
            throw new DomainException('ETP aprovado é imutável — a aprovação final do processo já travou este documento.');
        }

        $camposExtras = array_key_exists('campos_extras', $data) ? $data['campos_extras'] : ($etp->campos_extras ?? []);
        $this->camposConfiguracao->validarRespostas('etp', [
            ...$this->valoresNativos($data, $etp),
            ...($camposExtras ?? []),
        ]);
        $data = $this->sanitizarCamposRicos($data);

        return DB::transaction(function () use ($etp, $data, $user): Etp {
            $antes = $etp->toArray();
            $etp->update(array_intersect_key($data, array_flip(self::CAMPOS_DIFF)));
            $etp->refresh();
            $diff = $this->calcularDiff($antes, $etp->toArray());

            if ($diff !== []) {
                $this->registrarVersao($etp, 'revisado', $user, $diff);
                $this->audit->record('licita', 'etp.revisado', "Etp #{$etp->id}", $antes, $etp->toArray());
                $this->outbox->publish('licita.EtpRevisado', ['id' => $etp->id, 'campos' => array_keys($diff)]);
            }

            return $etp->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * Monta, para validarRespostas, o valor atual de cada seção nativa do
     * ETP — o que está em `$data` (o que o request enviou) e, faltando lá,
     * o que já está salvo em `$etp` (update parcial) ou `null` (criação).
     * Necessário porque a obrigatoriedade dessas seções é configurável pelo
     * tenant (ver CampoConfiguracaoService::CAMPOS_NATIVOS) e o request de
     * update é `sometimes` — omitir um campo não pode ser lido como "campo
     * apagado". Mesmo raciocínio do TrService::valoresNativos.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function valoresNativos(array $data, ?Etp $etp = null): array
    {
        $valores = [];
        foreach (['conteudo', 'equipe_planejamento'] as $campo) {
            $valores[$campo] = array_key_exists($campo, $data) ? $data[$campo] : $etp?->{$campo};
        }

        return $valores;
    }

    /**
     * Sanitiza os campos que aceitam HTML rico do TinyMCE (conteúdo e
     * campos_extras do tipo texto_longo) antes de persistir — defesa contra
     * XSS armazenado, mesma lógica do DfdService.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function sanitizarCamposRicos(array $data): array
    {
        if (array_key_exists('conteudo', $data) && is_string($data['conteudo'])) {
            $data['conteudo'] = $this->sanitizer->sanitize($data['conteudo']);
        }

        if (array_key_exists('campos_extras', $data) && is_array($data['campos_extras'])) {
            $config = $this->camposConfiguracao->getAtiva('etp');
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
    private function registrarVersao(Etp $etp, string $acao, User $user, array $camposAlterados = []): void
    {
        $proxima = ((int) $etp->versoes()->max('versao')) + 1;

        $etp->versoes()->create([
            'versao' => $proxima,
            'acao' => $acao,
            'campos_alterados' => $camposAlterados !== [] ? $camposAlterados : null,
            'dados' => $etp->toArray(),
            'user_id' => $user->id,
        ]);
    }
}

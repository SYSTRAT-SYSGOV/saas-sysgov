<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Models\Dfd;
use Modules\Licita\Models\Processo;
use Modules\Licita\Enums\StatusDfd;
use Modules\Licita\Support\HtmlSanitizer;

final class DfdService
{
    private const CAMPOS_DIFF = [
        'data_previsao',
        'grau_prioridade',
        'justificativa',
        'objeto',
        'previsao_pca',
        'numero_pca',
        'area_requisitante',
        'equipe_planejamento',
        'campos_extras',
    ];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly TenantContext $tenantContext,
        private readonly ProcessoService $processos,
        private readonly CampoConfiguracaoService $camposConfiguracao,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    /**
     * @param array<string, mixed> $data
     */
    public function criar(Processo $processo, array $data, User $user): Dfd
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação do DFD.');
        }

        if ($processo->dfd()->exists()) {
            throw new DomainException('Este processo já possui um DFD. Edite o existente em vez de criar outro.');
        }

        $this->camposConfiguracao->validarRespostas('dfd', $data['campos_extras'] ?? []);
        $data = $this->sanitizarCamposRicos($data);

        return DB::transaction(function () use ($processo, $data, $user): Dfd {
            $dfd = Dfd::create([
                ...$data,
                'processo_id' => $processo->id,
                'status' => StatusDfd::Rascunho->value,
                'elaborado_por' => $user->id,
            ]);

            $this->registrarVersao($dfd, 'criado', $user);
            $this->audit->record('licita', 'dfd.criado', "Dfd #{$dfd->id}", null, $dfd->toArray());
            $this->outbox->publish('licita.DfdCriado', ['id' => $dfd->id, 'processo_id' => $processo->id]);

            return $dfd->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function atualizar(Dfd $dfd, array $data, User $user): Dfd
    {
        if (!$dfd->statusEnum()->is(StatusDfd::Rascunho, StatusDfd::Rejeitado, StatusDfd::EmRevisao)) {
            throw new DomainException('DFD aprovado é imutável. Apenas rascunhos, em revisão ou rejeitados podem ser editados.');
        }

        $camposExtras = array_key_exists('campos_extras', $data) ? $data['campos_extras'] : ($dfd->campos_extras ?? []);
        $this->camposConfiguracao->validarRespostas('dfd', $camposExtras ?? []);
        $data = $this->sanitizarCamposRicos($data);

        return DB::transaction(function () use ($dfd, $data, $user): Dfd {
            $antes = $dfd->toArray();
            $dfd->update(array_intersect_key($data, array_flip(self::CAMPOS_DIFF)));
            $dfd->refresh();
            $diff = $this->calcularDiff($antes, $dfd->toArray());

            if ($diff !== []) {
                $this->registrarVersao($dfd, 'revisado', $user, $diff);
                $this->audit->record('licita', 'dfd.revisado', "Dfd #{$dfd->id}", $antes, $dfd->toArray());
                $this->outbox->publish('licita.DfdRevisado', ['id' => $dfd->id, 'campos' => array_keys($diff)]);
            }

            return $dfd->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function enviarParaRevisao(Dfd $dfd, User $user, ?string $mensagem = null): Dfd
    {
        $this->validarTransicao($dfd, StatusDfd::EmRevisao);

        return DB::transaction(function () use ($dfd, $user, $mensagem): Dfd {
            $dfd->update(['status' => StatusDfd::EmRevisao->value]);
            $dfd->refresh();

            $this->registrarVersao($dfd, 'enviado_revisao', $user, $mensagem !== null && $mensagem !== '' ? ['mensagem' => $mensagem] : []);
            $this->audit->record('licita', 'dfd.enviado_revisao', "Dfd #{$dfd->id}", null, ['mensagem' => $mensagem]);
            $this->outbox->publish('licita.DfdEnviadoRevisao', ['id' => $dfd->id]);

            return $dfd->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function aprovar(Dfd $dfd, User $aprovador, ?string $parecer = null): Dfd
    {
        $this->validarTransicao($dfd, StatusDfd::Aprovado);
        $this->validarSegregacaoFuncoes($dfd, $aprovador, 'aprová-lo');

        return DB::transaction(function () use ($dfd, $aprovador, $parecer): Dfd {
            $dfd->update([
                'status' => StatusDfd::Aprovado->value,
                'aprovado_por' => $aprovador->id,
                'aprovado_em' => now(),
            ]);
            $dfd->refresh();

            $this->registrarVersao($dfd, 'aprovado', $aprovador, $parecer !== null && $parecer !== '' ? ['parecer' => $parecer] : []);
            $this->audit->record('licita', 'dfd.aprovado', "Dfd #{$dfd->id}", null, ['parecer' => $parecer]);
            $this->outbox->publish('licita.DfdAprovado', ['id' => $dfd->id, 'processo_id' => $dfd->processo_id]);

            // RN-002: fluxo sequencial — ao aprovar o DFD, o processo avança para o ETP.
            $this->processos->avancarFase($dfd->processo, FaseLicita::Etp, $dfd->objeto);

            return $dfd->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function rejeitar(Dfd $dfd, User $rejeitor, string $motivo): Dfd
    {
        $this->validarTransicao($dfd, StatusDfd::Rejeitado);
        $this->validarSegregacaoFuncoes($dfd, $rejeitor, 'rejeitá-lo');

        return DB::transaction(function () use ($dfd, $rejeitor, $motivo): Dfd {
            $dfd->update(['status' => StatusDfd::Rejeitado->value]);
            $dfd->refresh();

            $this->registrarVersao($dfd, 'rejeitado', $rejeitor, ['motivo' => $motivo]);
            $this->audit->record('licita', 'dfd.rejeitado', "Dfd #{$dfd->id}", null, ['motivo' => $motivo]);
            $this->outbox->publish('licita.DfdRejeitado', ['id' => $dfd->id, 'motivo' => $motivo]);

            return $dfd->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * Sanitiza os campos que aceitam HTML rico do TinyMCE antes de persistir
     * (justificativa e campos_extras do tipo texto_longo) — defesa contra
     * XSS armazenado, já que esse conteúdo é re-renderizado para outros
     * usuários (ex.: quem aprova o DFD).
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function sanitizarCamposRicos(array $data): array
    {
        if (array_key_exists('justificativa', $data) && is_string($data['justificativa'])) {
            $data['justificativa'] = $this->sanitizer->sanitize($data['justificativa']);
        }

        if (array_key_exists('campos_extras', $data) && is_array($data['campos_extras'])) {
            $config = $this->camposConfiguracao->getAtiva('dfd');
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

    private function validarTransicao(Dfd $dfd, StatusDfd $novo): void
    {
        if (!$dfd->statusEnum()->podeTransicionarPara($novo)) {
            throw new DomainException(sprintf('Transição inválida de "%s" para "%s".', $dfd->statusEnum()->label(), $novo->label()));
        }
    }

    /**
     * RN-005: segregação de funções — quem elabora não pode aprovar/rejeitar o próprio DFD.
     */
    private function validarSegregacaoFuncoes(Dfd $dfd, User $ator, string $acao): void
    {
        if ($dfd->elaborado_por === (int) $ator->id) {
            throw new DomainException("RN-005: o elaborador do DFD não pode {$acao} (segregação de funções).");
        }
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
    private function registrarVersao(Dfd $dfd, string $acao, User $user, array $camposAlterados = []): void
    {
        $proxima = ((int) $dfd->versoes()->max('versao')) + 1;

        $dfd->versoes()->create([
            'versao' => $proxima,
            'acao' => $acao,
            'campos_alterados' => $camposAlterados !== [] ? $camposAlterados : null,
            'dados' => $dfd->toArray(),
            'user_id' => $user->id,
        ]);
    }
}

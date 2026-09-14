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
use Modules\Licita\Enums\StatusDfd;
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
        private readonly ProcessoService $processos,
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

        // RN-002: fluxo sequencial — o ETP só existe depois do DFD aprovado
        // (é ele quem faz o processo avançar para a fase "etp", ver
        // DfdService::aprovar).
        $dfd = $processo->dfd;
        if ($dfd === null || !$dfd->statusEnum()->is(StatusDfd::Aprovado)) {
            throw new DomainException('O DFD deste processo precisa estar aprovado antes de iniciar o ETP.');
        }

        if ($processo->etp()->exists()) {
            throw new DomainException('Este processo já possui um ETP. Edite o existente em vez de criar outro.');
        }

        $this->camposConfiguracao->validarRespostas('etp', $data['campos_extras'] ?? []);
        $data = $this->sanitizarCamposRicos($data);

        // Equipe de planejamento nasce como cópia da equipe já cadastrada no
        // DFD do mesmo processo — evita recadastro e mantém consistência no
        // início — mas fica num campo próprio do ETP, editável dali em
        // diante independentemente do DFD (não é uma referência viva).
        if (!array_key_exists('equipe_planejamento', $data) || $data['equipe_planejamento'] === null) {
            $data['equipe_planejamento'] = $dfd->equipe_planejamento;
        }

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
        if (!$etp->statusEnum()->is(StatusEtp::Rascunho, StatusEtp::Rejeitado, StatusEtp::EmRevisao)) {
            throw new DomainException('ETP aprovado é imutável. Apenas rascunhos, em revisão ou rejeitados podem ser editados.');
        }

        $camposExtras = array_key_exists('campos_extras', $data) ? $data['campos_extras'] : ($etp->campos_extras ?? []);
        $this->camposConfiguracao->validarRespostas('etp', $camposExtras ?? []);
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
     * Reabre um ETP rejeitado para edição (mesma RN-002 do DFD: rejeitado -> rascunho).
     */
    public function reabrir(Etp $etp, User $user): Etp
    {
        $this->validarTransicao($etp, StatusEtp::Rascunho);

        return DB::transaction(function () use ($etp, $user): Etp {
            $etp->update(['status' => StatusEtp::Rascunho->value]);
            $etp->refresh();

            $this->registrarVersao($etp, 'reaberto', $user);
            $this->audit->record('licita', 'etp.reaberto', "Etp #{$etp->id}", null, null);
            $this->outbox->publish('licita.EtpReaberto', ['id' => $etp->id]);

            return $etp->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function enviarParaRevisao(Etp $etp, User $user, ?string $mensagem = null): Etp
    {
        $this->validarTransicao($etp, StatusEtp::EmRevisao);

        return DB::transaction(function () use ($etp, $user, $mensagem): Etp {
            $etp->update(['status' => StatusEtp::EmRevisao->value]);
            $etp->refresh();

            $this->registrarVersao($etp, 'enviado_revisao', $user, $mensagem !== null && $mensagem !== '' ? ['mensagem' => $mensagem] : []);
            $this->audit->record('licita', 'etp.enviado_revisao', "Etp #{$etp->id}", null, ['mensagem' => $mensagem]);
            $this->outbox->publish('licita.EtpEnviadoRevisao', ['id' => $etp->id]);

            return $etp->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function aprovar(Etp $etp, User $aprovador, ?string $parecer = null): Etp
    {
        $this->validarTransicao($etp, StatusEtp::Aprovado);
        $this->validarSegregacaoFuncoes($etp, $aprovador, 'aprová-lo');

        return DB::transaction(function () use ($etp, $aprovador, $parecer): Etp {
            $etp->update([
                'status' => StatusEtp::Aprovado->value,
                'aprovado_por' => $aprovador->id,
                'aprovado_em' => now(),
            ]);
            $etp->refresh();

            $this->registrarVersao($etp, 'aprovado', $aprovador, $parecer !== null && $parecer !== '' ? ['parecer' => $parecer] : []);
            $this->audit->record('licita', 'etp.aprovado', "Etp #{$etp->id}", null, ['parecer' => $parecer]);
            $this->outbox->publish('licita.EtpAprovado', ['id' => $etp->id, 'processo_id' => $etp->processo_id]);

            // RN-002: fluxo sequencial — ao aprovar o ETP, o processo avança
            // para o Mapa de Riscos.
            $this->processos->avancarFase($etp->processo, FaseLicita::MapaRiscos);

            return $etp->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function rejeitar(Etp $etp, User $rejeitor, string $motivo): Etp
    {
        $this->validarTransicao($etp, StatusEtp::Rejeitado);
        $this->validarSegregacaoFuncoes($etp, $rejeitor, 'rejeitá-lo');

        return DB::transaction(function () use ($etp, $rejeitor, $motivo): Etp {
            $etp->update(['status' => StatusEtp::Rejeitado->value]);
            $etp->refresh();

            $this->registrarVersao($etp, 'rejeitado', $rejeitor, ['motivo' => $motivo]);
            $this->audit->record('licita', 'etp.rejeitado', "Etp #{$etp->id}", null, ['motivo' => $motivo]);
            $this->outbox->publish('licita.EtpRejeitado', ['id' => $etp->id, 'motivo' => $motivo]);

            return $etp->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
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

    private function validarTransicao(Etp $etp, StatusEtp $novo): void
    {
        if (!$etp->statusEnum()->podeTransicionarPara($novo)) {
            throw new DomainException(sprintf('Transição inválida de "%s" para "%s".', $etp->statusEnum()->label(), $novo->label()));
        }
    }

    /**
     * RN-005: segregação de funções — quem elabora não pode aprovar/rejeitar o próprio ETP.
     */
    private function validarSegregacaoFuncoes(Etp $etp, User $ator, string $acao): void
    {
        if ($etp->elaborado_por === (int) $ator->id) {
            throw new DomainException("RN-005: o elaborador do ETP não pode {$acao} (segregação de funções).");
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

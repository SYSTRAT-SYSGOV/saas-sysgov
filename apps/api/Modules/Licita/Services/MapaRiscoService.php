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
use Modules\Licita\Enums\StatusEtp;
use Modules\Licita\Enums\StatusMapaRisco;
use Modules\Licita\Models\MapaRisco;
use Modules\Licita\Models\Processo;
use Modules\Licita\Support\HtmlSanitizer;

final class MapaRiscoService
{
    private const CAMPOS_DIFF = [
        'equipe_planejamento',
        'riscos',
        'campos_extras',
    ];

    /** Campos de texto de cada risco que aceitam HTML rico do TinyMCE (ver sanitizarRiscos). */
    private const CAMPOS_RICOS_RISCO = ['causa', 'dano', 'acao_preventiva', 'acao_contingencia'];

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
    public function criar(Processo $processo, array $data, User $user): MapaRisco
    {
        if (!$this->tenantContext->hasTenant()) {
            throw new DomainException('RN-001: tenant não identificado para criação do Mapa de Riscos.');
        }

        // RN-002: fluxo sequencial — o Mapa de Riscos só existe depois do
        // ETP aprovado (é ele quem faz o processo avançar para a fase
        // "mapa_riscos", ver EtpService::aprovar).
        $etp = $processo->etp;
        if ($etp === null || !$etp->statusEnum()->is(StatusEtp::Aprovado)) {
            throw new DomainException('O ETP deste processo precisa estar aprovado antes de iniciar o Mapa de Riscos.');
        }

        if ($processo->mapaRisco()->exists()) {
            throw new DomainException('Este processo já possui um Mapa de Riscos. Edite o existente em vez de criar outro.');
        }

        $this->camposConfiguracao->validarRespostas('mapa_riscos', $data['campos_extras'] ?? []);
        $data = $this->sanitizarCamposRicos($data);

        // Equipe de planejamento nasce como cópia da equipe já cadastrada no
        // ETP do mesmo processo — mesmo raciocínio do ETP em relação ao DFD
        // (ver EtpService::criar) — mas fica num campo próprio, editável
        // dali em diante independentemente do ETP.
        if (!array_key_exists('equipe_planejamento', $data) || $data['equipe_planejamento'] === null) {
            $data['equipe_planejamento'] = $etp->equipe_planejamento;
        }

        return DB::transaction(function () use ($processo, $data, $user): MapaRisco {
            $mapaRisco = MapaRisco::create([
                ...$data,
                'processo_id' => $processo->id,
                'status' => StatusMapaRisco::Rascunho->value,
                'elaborado_por' => $user->id,
            ]);

            $this->registrarVersao($mapaRisco, 'criado', $user);
            $this->audit->record('licita', 'mapa_riscos.criado', "MapaRisco #{$mapaRisco->id}", null, $mapaRisco->toArray());
            $this->outbox->publish('licita.MapaRiscoCriado', ['id' => $mapaRisco->id, 'processo_id' => $processo->id]);

            return $mapaRisco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * @param array<string, mixed> $data
     */
    public function atualizar(MapaRisco $mapaRisco, array $data, User $user): MapaRisco
    {
        if (!$mapaRisco->statusEnum()->is(StatusMapaRisco::Rascunho, StatusMapaRisco::Rejeitado, StatusMapaRisco::EmRevisao)) {
            throw new DomainException('Mapa de Riscos aprovado é imutável. Apenas rascunhos, em revisão ou rejeitados podem ser editados.');
        }

        $camposExtras = array_key_exists('campos_extras', $data) ? $data['campos_extras'] : ($mapaRisco->campos_extras ?? []);
        $this->camposConfiguracao->validarRespostas('mapa_riscos', $camposExtras ?? []);
        $data = $this->sanitizarCamposRicos($data);

        return DB::transaction(function () use ($mapaRisco, $data, $user): MapaRisco {
            $antes = $mapaRisco->toArray();
            $mapaRisco->update(array_intersect_key($data, array_flip(self::CAMPOS_DIFF)));
            $mapaRisco->refresh();
            $diff = $this->calcularDiff($antes, $mapaRisco->toArray());

            if ($diff !== []) {
                $this->registrarVersao($mapaRisco, 'revisado', $user, $diff);
                $this->audit->record('licita', 'mapa_riscos.revisado', "MapaRisco #{$mapaRisco->id}", $antes, $mapaRisco->toArray());
                $this->outbox->publish('licita.MapaRiscoRevisado', ['id' => $mapaRisco->id, 'campos' => array_keys($diff)]);
            }

            return $mapaRisco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * Reabre um Mapa de Riscos rejeitado para edição (mesma RN-002 do DFD/ETP: rejeitado -> rascunho).
     */
    public function reabrir(MapaRisco $mapaRisco, User $user): MapaRisco
    {
        $this->validarTransicao($mapaRisco, StatusMapaRisco::Rascunho);

        return DB::transaction(function () use ($mapaRisco, $user): MapaRisco {
            $mapaRisco->update(['status' => StatusMapaRisco::Rascunho->value]);
            $mapaRisco->refresh();

            $this->registrarVersao($mapaRisco, 'reaberto', $user);
            $this->audit->record('licita', 'mapa_riscos.reaberto', "MapaRisco #{$mapaRisco->id}", null, null);
            $this->outbox->publish('licita.MapaRiscoReaberto', ['id' => $mapaRisco->id]);

            return $mapaRisco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function enviarParaRevisao(MapaRisco $mapaRisco, User $user, ?string $mensagem = null): MapaRisco
    {
        $this->validarTransicao($mapaRisco, StatusMapaRisco::EmRevisao);

        return DB::transaction(function () use ($mapaRisco, $user, $mensagem): MapaRisco {
            $mapaRisco->update(['status' => StatusMapaRisco::EmRevisao->value]);
            $mapaRisco->refresh();

            $this->registrarVersao($mapaRisco, 'enviado_revisao', $user, $mensagem !== null && $mensagem !== '' ? ['mensagem' => $mensagem] : []);
            $this->audit->record('licita', 'mapa_riscos.enviado_revisao', "MapaRisco #{$mapaRisco->id}", null, ['mensagem' => $mensagem]);
            $this->outbox->publish('licita.MapaRiscoEnviadoRevisao', ['id' => $mapaRisco->id]);

            return $mapaRisco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function aprovar(MapaRisco $mapaRisco, User $aprovador, ?string $parecer = null): MapaRisco
    {
        $this->validarTransicao($mapaRisco, StatusMapaRisco::Aprovado);
        $this->validarSegregacaoFuncoes($mapaRisco, $aprovador, 'aprová-lo');

        return DB::transaction(function () use ($mapaRisco, $aprovador, $parecer): MapaRisco {
            $mapaRisco->update([
                'status' => StatusMapaRisco::Aprovado->value,
                'aprovado_por' => $aprovador->id,
                'aprovado_em' => now(),
            ]);
            $mapaRisco->refresh();

            $this->registrarVersao($mapaRisco, 'aprovado', $aprovador, $parecer !== null && $parecer !== '' ? ['parecer' => $parecer] : []);
            $this->audit->record('licita', 'mapa_riscos.aprovado', "MapaRisco #{$mapaRisco->id}", null, ['parecer' => $parecer]);
            $this->outbox->publish('licita.MapaRiscoAprovado', ['id' => $mapaRisco->id, 'processo_id' => $mapaRisco->processo_id]);

            // RN-002: fluxo sequencial — ao aprovar o Mapa de Riscos, o
            // processo avança para a Pesquisa de Preços.
            $this->processos->avancarFase($mapaRisco->processo, FaseLicita::PesquisaPrecos);

            return $mapaRisco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    public function rejeitar(MapaRisco $mapaRisco, User $rejeitor, string $motivo): MapaRisco
    {
        $this->validarTransicao($mapaRisco, StatusMapaRisco::Rejeitado);
        $this->validarSegregacaoFuncoes($mapaRisco, $rejeitor, 'rejeitá-lo');

        return DB::transaction(function () use ($mapaRisco, $rejeitor, $motivo): MapaRisco {
            $mapaRisco->update(['status' => StatusMapaRisco::Rejeitado->value]);
            $mapaRisco->refresh();

            $this->registrarVersao($mapaRisco, 'rejeitado', $rejeitor, ['motivo' => $motivo]);
            $this->audit->record('licita', 'mapa_riscos.rejeitado', "MapaRisco #{$mapaRisco->id}", null, ['motivo' => $motivo]);
            $this->outbox->publish('licita.MapaRiscoRejeitado', ['id' => $mapaRisco->id, 'motivo' => $motivo]);

            return $mapaRisco->load(['elaborador', 'aprovador', 'versoes.usuario']);
        });
    }

    /**
     * Sanitiza os campos de texto rico do TinyMCE (dentro de cada risco e
     * dos campos_extras do tipo texto_longo) antes de persistir — defesa
     * contra XSS armazenado, mesma lógica do DfdService/EtpService.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function sanitizarCamposRicos(array $data): array
    {
        if (array_key_exists('riscos', $data) && is_array($data['riscos'])) {
            foreach ($data['riscos'] as $index => $risco) {
                foreach (self::CAMPOS_RICOS_RISCO as $campo) {
                    if (isset($risco[$campo]) && is_string($risco[$campo])) {
                        $data['riscos'][$index][$campo] = $this->sanitizer->sanitize($risco[$campo]);
                    }
                }
            }
        }

        if (array_key_exists('campos_extras', $data) && is_array($data['campos_extras'])) {
            $config = $this->camposConfiguracao->getAtiva('mapa_riscos');
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

    private function validarTransicao(MapaRisco $mapaRisco, StatusMapaRisco $novo): void
    {
        if (!$mapaRisco->statusEnum()->podeTransicionarPara($novo)) {
            throw new DomainException(sprintf('Transição inválida de "%s" para "%s".', $mapaRisco->statusEnum()->label(), $novo->label()));
        }
    }

    /**
     * RN-005: segregação de funções — quem elabora não pode aprovar/rejeitar o próprio Mapa de Riscos.
     */
    private function validarSegregacaoFuncoes(MapaRisco $mapaRisco, User $ator, string $acao): void
    {
        if ($mapaRisco->elaborado_por === (int) $ator->id) {
            throw new DomainException("RN-005: o elaborador do Mapa de Riscos não pode {$acao} (segregação de funções).");
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
    private function registrarVersao(MapaRisco $mapaRisco, string $acao, User $user, array $camposAlterados = []): void
    {
        $proxima = ((int) $mapaRisco->versoes()->max('versao')) + 1;

        $mapaRisco->versoes()->create([
            'versao' => $proxima,
            'acao' => $acao,
            'campos_alterados' => $camposAlterados !== [] ? $camposAlterados : null,
            'dados' => $mapaRisco->toArray(),
            'user_id' => $user->id,
        ]);
    }
}

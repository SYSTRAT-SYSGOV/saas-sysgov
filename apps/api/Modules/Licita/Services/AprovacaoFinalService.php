<?php

declare(strict_types=1);

namespace Modules\Licita\Services;

use App\Models\User;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use DomainException;
use Illuminate\Support\Facades\DB;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Enums\StatusAprovacaoFinal;
use Modules\Licita\Enums\StatusEdital;
use Modules\Licita\Enums\StatusEtp;
use Modules\Licita\Enums\StatusMapaRisco;
use Modules\Licita\Enums\StatusPesquisaPreco;
use Modules\Licita\Enums\StatusTr;
use Modules\Licita\Models\AprovacaoFinal;
use Modules\Licita\Models\Processo;

/**
 * Aprovação final do Ordenador de Despesas sobre o pacote inteiro de
 * artefatos do processo (ETP, Mapa de Riscos, Pesquisa de Preços, TR e
 * Edital), de uma vez só, no mesmo padrão de "homologação em lote" já usado
 * por `Modules\Capd\Services\HomologacaoLoteService`. É a única aprovação
 * formal depois do DFD — os documentos individuais não têm mais
 * aprovação/segregação de funções próprias (ver EtpService, MapaRiscoService,
 * PesquisaPrecoService, TrService, EditalService).
 */
final class AprovacaoFinalService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly OutboxPublisher $outbox,
        private readonly ProcessoService $processos,
        private readonly PesquisaPrecoService $pesquisasPrecos,
    ) {}

    public function solicitar(Processo $processo, User $user): AprovacaoFinal
    {
        $etp = $processo->etp;
        $mapaRisco = $processo->mapaRisco;
        $pesquisaPreco = $processo->pesquisaPreco;
        $tr = $processo->tr;
        $edital = $processo->edital;

        if ($etp === null || $mapaRisco === null || $pesquisaPreco === null || $tr === null || $edital === null) {
            throw new DomainException('Cadastre o ETP, o Mapa de Riscos, a Pesquisa de Preços, o Termo de Referência e o Edital deste processo antes de solicitar a aprovação final.');
        }

        // RN-006 migrou pra cá: antes era checado no "enviar para revisão"
        // individual da Pesquisa de Preços, que deixou de existir.
        $this->pesquisasPrecos->validarCompletude($pesquisaPreco);

        return DB::transaction(function () use ($processo, $user): AprovacaoFinal {
            $aprovacao = AprovacaoFinal::updateOrCreate(
                ['processo_id' => $processo->id],
                [
                    'status' => StatusAprovacaoFinal::Pendente->value,
                    'solicitado_por' => $user->id,
                    'solicitado_em' => now(),
                    'aprovado_por' => null,
                    'aprovado_em' => null,
                    'parecer' => null,
                    'motivo_rejeicao' => null,
                ],
            );

            $this->processos->avancarFase($processo, FaseLicita::AprovacaoOrdenador);

            $this->audit->record('licita', 'aprovacao_final.solicitada', "Processo #{$processo->id}", null, $aprovacao->toArray());
            $this->outbox->publish('licita.AprovacaoFinalSolicitada', ['processo_id' => $processo->id]);

            return $aprovacao->fresh(['solicitante', 'aprovador']);
        });
    }

    public function aprovar(Processo $processo, User $ordenador, ?string $parecer = null): AprovacaoFinal
    {
        $aprovacao = $processo->aprovacaoFinal;
        if ($aprovacao === null || !$aprovacao->statusEnum()->is(StatusAprovacaoFinal::Pendente)) {
            throw new DomainException('Não há aprovação final pendente para este processo.');
        }

        // RN-005: segregação de funções — a única que resta no fluxo pós-DFD.
        // Quem solicitou a aprovação final não pode ser quem a concede.
        if ($aprovacao->solicitado_por === (int) $ordenador->id) {
            throw new DomainException('RN-005: quem solicitou a aprovação final não pode aprová-la (segregação de funções).');
        }

        // Defesa contra uma solicitação pendente criada ANTES de um novo
        // artefato entrar na lista de exigidos (ex.: pendências abertas
        // antes do Edital existir no sistema) — sem isso, o foreach abaixo
        // chamaria update() em null e quebraria com um erro fatal em vez de
        // uma mensagem acionável. solicitar() já impede criar uma
        // pendência nova sem todos os artefatos, então isso só deve
        // acontecer para pendências antigas.
        if ($processo->etp === null || $processo->mapaRisco === null || $processo->pesquisaPreco === null || $processo->tr === null || $processo->edital === null) {
            throw new DomainException('Esta solicitação de aprovação final é anterior a um artefato hoje exigido (ETP, Mapa de Riscos, Pesquisa de Preços, Termo de Referência ou Edital). Rejeite-a e peça à equipe de planejamento que cadastre o que faltar antes de solicitar novamente.');
        }

        return DB::transaction(function () use ($processo, $ordenador, $parecer, $aprovacao): AprovacaoFinal {
            $agora = now();

            foreach ([
                [$processo->etp, StatusEtp::Aprovado->value, 'etp.aprovado', 'licita.EtpAprovado'],
                [$processo->mapaRisco, StatusMapaRisco::Aprovado->value, 'mapa_riscos.aprovado', 'licita.MapaRiscoAprovado'],
                [$processo->pesquisaPreco, StatusPesquisaPreco::Aprovado->value, 'pesquisa_precos.aprovado', 'licita.PesquisaPrecoAprovado'],
                [$processo->tr, StatusTr::Aprovado->value, 'tr.aprovado', 'licita.TrAprovado'],
                [$processo->edital, StatusEdital::Aprovado->value, 'edital.aprovado', 'licita.EditalAprovado'],
            ] as [$documento, $statusAprovado, $eventoAudit, $eventoOutbox]) {
                $documento->update([
                    'status' => $statusAprovado,
                    'aprovado_por' => $ordenador->id,
                    'aprovado_em' => $agora,
                ]);
                $documento->refresh();

                $proximaVersao = ((int) $documento->versoes()->max('versao')) + 1;
                $documento->versoes()->create([
                    'versao' => $proximaVersao,
                    'acao' => 'aprovado',
                    'campos_alterados' => $parecer !== null && $parecer !== '' ? ['parecer' => $parecer] : null,
                    'dados' => $documento->toArray(),
                    'user_id' => $ordenador->id,
                ]);

                $this->audit->record('licita', $eventoAudit, get_class($documento) . " #{$documento->id}", null, ['parecer' => $parecer]);
                $this->outbox->publish($eventoOutbox, ['id' => $documento->id, 'processo_id' => $processo->id]);
            }

            $aprovacao->update([
                'status' => StatusAprovacaoFinal::Aprovada->value,
                'aprovado_por' => $ordenador->id,
                'aprovado_em' => $agora,
                'parecer' => $parecer,
            ]);

            $this->processos->avancarFase($processo, FaseLicita::Concluido);

            $this->audit->record('licita', 'aprovacao_final.aprovada', "Processo #{$processo->id}", null, ['parecer' => $parecer]);
            $this->outbox->publish('licita.AprovacaoFinalAprovada', ['processo_id' => $processo->id]);

            return $aprovacao->fresh(['solicitante', 'aprovador']);
        });
    }

    public function rejeitar(Processo $processo, User $ordenador, string $motivo): AprovacaoFinal
    {
        $aprovacao = $processo->aprovacaoFinal;
        if ($aprovacao === null || !$aprovacao->statusEnum()->is(StatusAprovacaoFinal::Pendente)) {
            throw new DomainException('Não há aprovação final pendente para este processo.');
        }

        if ($aprovacao->solicitado_por === (int) $ordenador->id) {
            throw new DomainException('RN-005: quem solicitou a aprovação final não pode rejeitá-la (segregação de funções).');
        }

        return DB::transaction(function () use ($processo, $ordenador, $motivo, $aprovacao): AprovacaoFinal {
            $aprovacao->update([
                'status' => StatusAprovacaoFinal::Rejeitada->value,
                'aprovado_por' => $ordenador->id,
                'aprovado_em' => now(),
                'motivo_rejeicao' => $motivo,
            ]);

            // Documentos nunca chegaram a "aprovado" — continuam como
            // estavam, editáveis. O processo volta a ficar em elaboração
            // pra equipe de planejamento ajustar e solicitar de novo.
            $this->processos->avancarFase($processo, FaseLicita::EmElaboracao);

            $this->audit->record('licita', 'aprovacao_final.rejeitada', "Processo #{$processo->id}", null, ['motivo' => $motivo]);
            $this->outbox->publish('licita.AprovacaoFinalRejeitada', ['processo_id' => $processo->id, 'motivo' => $motivo]);

            return $aprovacao->fresh(['solicitante', 'aprovador']);
        });
    }
}

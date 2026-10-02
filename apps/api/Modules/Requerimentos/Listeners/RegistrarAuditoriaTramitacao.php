<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Listeners;

use Illuminate\Support\Facades\Log;

final class RegistrarAuditoriaTramitacao
{
    /**
     * Registra eventos de tramitação na trilha de auditoria.
     */
    public function handle(object $event): void
    {
        $loggableEvents = [
            \Modules\Requerimentos\Events\ProposicaoStatusChanged::class,
            \Modules\Requerimentos\Events\TramitacaoEncaminhada::class,
            \Modules\Requerimentos\Events\TramitacaoRecebida::class,
            \Modules\Requerimentos\Events\TramitacaoRespondida::class,
            \Modules\Requerimentos\Events\PrazoVencido::class,
        ];

        if (! in_array($event::class, $loggableEvents, true)) {
            return;
        }

        // Depois do guard acima, $event::class só pode ser um dos 5 em $loggableEvents — o
        // último (PrazoVencido) vira `default` porque é o único que sobra por eliminação
        // (Larastan aponta a comparação explícita como sempre verdadeira, logo morta).
        match ($event::class) {
            \Modules\Requerimentos\Events\ProposicaoStatusChanged::class => $this->registrarMudancaStatus($event),
            \Modules\Requerimentos\Events\TramitacaoEncaminhada::class => $this->registrarTramitacao($event, 'proposicao.tramitacao_encaminhada'),
            \Modules\Requerimentos\Events\TramitacaoRecebida::class     => $this->registrarTramitacao($event, 'proposicao.tramitacao_recebida'),
            \Modules\Requerimentos\Events\TramitacaoRespondida::class   => $this->registrarTramitacao($event, 'proposicao.tramitacao_respondida'),
            default => $this->registrarTramitacao($event, 'proposicao.prazo_vencido'),
        };
    }

    private function registrarMudancaStatus(\Modules\Requerimentos\Events\ProposicaoStatusChanged $event): void
    {
        Log::channel('audit')->info('Status de proposição alterado', [
            'proposicao_id'     => $event->proposicao->id,
            'tenant_id'         => $event->proposicao->tenant_id,
            'status_anterior'   => $event->statusAnterior,
            'status_novo'       => $event->statusNovo,
            'event'             => 'proposicao.status_changed',
            'timestamp'         => now()->toIso8601String(),
        ]);
    }

    private function registrarTramitacao(object $event, string $eventName): void
    {
        $tramitacao = $event->tramitacao;

        Log::channel('audit')->info($eventName, [
            'tramitacao_id'     => $tramitacao->id,
            'proposicao_id'     => $tramitacao->proposicao_id,
            'tenant_id'         => $tramitacao->tenant_id,
            'poder_origem'      => $tramitacao->poder_origem,
            'poder_destino'     => $tramitacao->poder_destino,
            'status'            => $tramitacao->status,
            'event'             => $eventName,
            'timestamp'         => now()->toIso8601String(),
        ]);
    }
}
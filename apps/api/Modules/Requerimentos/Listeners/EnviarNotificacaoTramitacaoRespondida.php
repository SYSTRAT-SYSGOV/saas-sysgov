<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Listeners;

use Modules\Requerimentos\Events\TramitacaoRespondida;
use Modules\Requerimentos\Jobs\EnviarNotificacaoJob;

final class EnviarNotificacaoTramitacaoRespondida
{
    public function handle(TramitacaoRespondida $event): void
    {
        $tramitacao = $event->tramitacao;
        $proposicao = $tramitacao->proposicao;

        // Notifica o autor da proposição
        EnviarNotificacaoJob::dispatch(
            $proposicao->autor_principal_id,
            'tramitacao.respondida',
            'Proposição respondida',
            "Sua proposição {$proposicao->numero} recebeu resposta do Poder {$tramitacao->poder_destino}.",
            'ambos',
            $proposicao->id,
        );

        // Notifica o remetente da tramitação
        if ($tramitacao->remetente_id !== $proposicao->autor_principal_id) {
            EnviarNotificacaoJob::dispatch(
                $tramitacao->remetente_id,
                'tramitacao.respondida',
                'Tramitação respondida',
                "A tramitação da proposição {$proposicao->numero} foi respondida.",
                'ambos',
                $proposicao->id,
            );
        }
    }
}
<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Listeners;

use Modules\Requerimentos\Events\TramitacaoEncaminhada;
use Modules\Requerimentos\Jobs\EnviarNotificacaoJob;

final class EnviarNotificacaoTramitacaoEncaminhada
{
    public function handle(TramitacaoEncaminhada $event): void
    {
        $tramitacao = $event->tramitacao;
        $proposicao = $tramitacao->proposicao;

        // Notifica o responsável no Poder destinatário
        if ($tramitacao->responsavel_id) {
            EnviarNotificacaoJob::dispatch(
                $tramitacao->responsavel_id,
                'tramitacao.encaminhada',
                'Nova proposição recebida',
                "A proposição {$proposicao->numero} foi encaminhada para sua responsabilidade. Prazo: {$tramitacao->data_limite_resposta->format('d/m/Y')}.",
                'ambos',
                $proposicao->id,
            );
        }

        // Notifica o autor
        EnviarNotificacaoJob::dispatch(
            $proposicao->autor_principal_id,
            'tramitacao.encaminhada',
            'Proposição encaminhada',
            "Sua proposição {$proposicao->numero} foi encaminhada ao Poder {$tramitacao->poder_destino}.",
            'ambos',
            $proposicao->id,
        );
    }
}
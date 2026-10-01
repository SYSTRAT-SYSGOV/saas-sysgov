<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Listeners;

use Modules\Requerimentos\Events\PrazoVencido;
use Modules\Requerimentos\Jobs\EnviarNotificacaoJob;

final class EnviarNotificacaoPrazoVencido
{
    public function handle(PrazoVencido $event): void
    {
        $tramitacao = $event->tramitacao;
        $proposicao = $tramitacao->proposicao;

        $mensagem = "O prazo de resposta da proposição {$proposicao->numero} venceu em {$tramitacao->data_limite_resposta->format('d/m/Y')}.";

        if ($tramitacao->responsavel_id) {
            EnviarNotificacaoJob::dispatch(
                $tramitacao->responsavel_id,
                'prazo.vencido',
                'Prazo de resposta vencido',
                $mensagem,
                'ambos',
                $proposicao->id,
            );
        }

        EnviarNotificacaoJob::dispatch(
            $proposicao->autor_principal_id,
            'prazo.vencido',
            'Prazo de resposta vencido',
            $mensagem,
            'ambos',
            $proposicao->id,
        );
    }
}
<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Listeners;

use Modules\Requerimentos\Events\PrazoProximo;
use Modules\Requerimentos\Jobs\EnviarNotificacaoJob;

final class EnviarNotificacaoPrazoProximo
{
    public function handle(PrazoProximo $event): void
    {
        $tramitacao = $event->tramitacao;
        $proposicao = $tramitacao->proposicao;

        $mensagem = "A proposição {$proposicao->numero} tem prazo de resposta se esgotando em {$event->diasRestantes} dia(s). Data limite: {$tramitacao->data_limite_resposta->format('d/m/Y')}.";

        if ($tramitacao->responsavel_id) {
            EnviarNotificacaoJob::dispatch(
                $tramitacao->responsavel_id,
                'prazo.proximo',
                'Prazo de resposta próximo',
                $mensagem,
                'ambos',
                $proposicao->id,
            );
        }

        EnviarNotificacaoJob::dispatch(
            $proposicao->autor_principal_id,
            'prazo.proximo',
            'Prazo de resposta próximo',
            $mensagem,
            'ambos',
            $proposicao->id,
        );
    }
}
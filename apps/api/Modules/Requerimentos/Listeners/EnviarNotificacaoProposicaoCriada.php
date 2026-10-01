<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Listeners;

use Modules\Requerimentos\Events\ProposicaoCriada;
use Modules\Requerimentos\Jobs\EnviarNotificacaoJob;

final class EnviarNotificacaoProposicaoCriada
{
    public function handle(ProposicaoCriada $event): void
    {
        EnviarNotificacaoJob::dispatch(
            $event->proposicao->autor_principal_id,
            'proposicao.criada',
            'Proposição criada',
            "Sua proposição {$event->proposicao->numero} foi protocolada com sucesso.",
            'ambos',
            $event->proposicao->id,
        );
    }
}
<?php

declare(strict_types=1);

namespace Modules\Capd\Listeners;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Modules\Capd\Events\CicloOpened;
use Modules\Capd\Services\NotificacaoService;

final class SendCycleNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct(
        private readonly NotificacaoService $notificacoes,
    ) {}

    public function handle(CicloOpened $event): void
    {
        // Dispara notificações para todos os servidores vinculados ao ciclo
        $this->notificacoes->notificarAberturaCiclo($event->ciclo);
    }
}

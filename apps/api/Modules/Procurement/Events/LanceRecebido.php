<?php

declare(strict_types=1);

namespace Modules\Procurement\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Modules\Procurement\Models\LicitacaoLance;

final class LanceRecebido implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public LicitacaoLance $lance) {}

    public function broadcastOn(): Channel
    {
        return new Channel("licitacao.{$this->lance->licitacao_id}");
    }

    public function broadcastAs(): string
    {
        return 'lance.recebido';
    }
}

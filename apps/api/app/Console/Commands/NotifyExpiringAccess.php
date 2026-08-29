<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\UserModuleAccess;
use App\Support\OutboxPublisher;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

final class NotifyExpiringAccess extends Command
{
    protected $signature = 'sysgov:notify-expiring-access';
    protected $description = 'Notifica o admin geral sobre acessos que expiram nos proximos 30 dias';

    public function handle(OutboxPublisher $outbox): int
    {
        $now = Carbon::now();
        $expiring = UserModuleAccess::query()
            ->where('status', UserModuleAccess::STATUS_ACTIVE)
            ->where('valid_to', '>', $now)
            ->where('valid_to', '<=', $now->copy()->addDays(30))
            ->with(['user:id,name,email', 'tenant:id,name'])
            ->get();

        $count = 0;
        foreach ($expiring as $access) {
            $outbox->publish('notification.access_expiring', [
                'user_id' => $access->user_id,
                'user_name' => $access->user?->name,
                'tenant_id' => $access->tenant_id,
                'tenant_name' => $access->tenant?->name,
                'module_alias' => $access->module_alias,
                'expires_at' => $access->valid_to?->toISOString(),
            ], $access->tenant_id);
            $count++;
        }

        $this->info("{$count} acessos com expiração próxima notificados.");
        return self::SUCCESS;
    }
}
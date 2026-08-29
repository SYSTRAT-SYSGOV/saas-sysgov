<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\UserModuleAccess;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

final class ExpireAccess extends Command
{
    protected $signature = 'sysgov:expire-access';
    protected $description = 'Marca acessos vencidos como expired e notifica via Outbox';

    public function handle(AuditLogger $audit, OutboxPublisher $outbox): int
    {
        $now = Carbon::now();
        $expired = UserModuleAccess::query()
            ->where('status', UserModuleAccess::STATUS_ACTIVE)
            ->where('valid_to', '<', $now)
            ->get();

        $count = 0;
        foreach ($expired as $access) {
            $before = $access->toArray();
            $access->forceFill(['status' => UserModuleAccess::STATUS_EXPIRED])->save();
            $audit->record('access', 'access.expired', "user:{$access->user_id}:module:{$access->module_alias}", $before, $access->fresh()->toArray());
            $outbox->publish('notification.access_expired', [
                'user_id' => $access->user_id,
                'tenant_id' => $access->tenant_id,
                'module_alias' => $access->module_alias,
                'expired_at' => $now->toISOString(),
            ], $access->tenant_id);
            $count++;
        }

        $this->info("{$count} acessos expirados e notificados.");
        return self::SUCCESS;
    }
}
<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\OutboxEvent;
use Illuminate\Support\Facades\DB;

final readonly class OutboxPublisher
{
    public function __construct(private TenantContext $tenantContext) {}
    public function publish(string $type, array $payload, ?int $tenantId = null): OutboxEvent
    {
        return OutboxEvent::create(['event_type' => $type, 'event_version' => 1, 'tenant_id' => $tenantId ?? ($this->tenantContext->hasTenant() ? $this->tenantContext->id() : null), 'payload' => $payload, 'status' => 'pending', 'available_at' => now()]);
    }
}

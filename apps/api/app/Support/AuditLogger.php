<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Http\Request;

final readonly class AuditLogger
{
    public function __construct(private Request $request, private TenantContext $tenantContext) {}
    public function record(string $module, string $action, string $resource, ?array $before = null, ?array $after = null): AuditLog
    {
        return AuditLog::create([
            'tenant_id' => $this->tenantContext->hasTenant() ? $this->tenantContext->id() : null,
            'user_id' => $this->request->user()?->getKey(), 'module' => $module, 'action' => $action,
            'resource' => $resource, 'before' => $before, 'after' => $after,
            'ip' => $this->request->ip(), 'user_agent' => $this->request->userAgent(), 'created_at' => now(),
        ]);
    }
}

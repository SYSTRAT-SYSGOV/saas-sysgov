<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Http\Request;

final readonly class AuditLogger
{
    public function __construct(private Request $request, private TenantContext $tenantContext) {}

    /**
     * Registra evento de auditoria com HMAC encadeado (RN-USR-007)
     * hash = sha256(concat(tenant_id, user_id, action, resource, json(before), json(after), timestamp, prev_hash))
     *
     * @param array<string, mixed>|null $before
     * @param array<string, mixed>|null $after
     */
    public function record(string $module, string $action, string $resource, ?array $before = null, ?array $after = null): AuditLog
    {
        $tenantId = $this->tenantContext->hasTenant() ? $this->tenantContext->id() : null;
        $userId = $this->request->user()?->getKey();
        $timestamp = now();
        $timestampHash = $timestamp->format('Y-m-d H:i:s');

        // Obtém o hash do último registro para encadeamento
        $prevHash = AuditLog::query()->orderByDesc('id')->value('hash');

        $hashPayload = implode('|', [
            (string) ($tenantId ?? ''),
            (string) ($userId ?? ''),
            $action,
            $resource,
            (string) json_encode($before),
            (string) json_encode($after),
            $timestampHash,
            (string) ($prevHash ?? ''),
        ]);

        return AuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'module' => $module,
            'action' => $action,
            'resource' => $resource,
            'before' => $before,
            'after' => $after,
            'ip' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
            'created_at' => $timestamp,
            'hash' => hash('sha256', $hashPayload),
            'prev_hash' => $prevHash,
        ]);
    }
}

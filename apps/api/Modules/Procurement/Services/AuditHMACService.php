<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use App\Models\AuditLog;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

final readonly class AuditHMACService
{
    private string $hmacKey;

    public function __construct(
        private Request $request,
        private TenantContext $tenantContext
    ) {
        $this->hmacKey = (string) config('app.key', 'sysgov-secret-audit-key');
    }

    /**
     * Registra auditoria com encadeamento de hash HMAC (Blockchain-like - RN-020)
     */
    public function record(
        string $module,
        string $action,
        string $resource,
        ?array $before = null,
        ?array $after = null
    ): AuditLog {
        $tenantId = $this->tenantContext->hasTenant() ? $this->tenantContext->id() : null;
        $cacheKey = "audit:last_hash:tenant_{$tenantId}";
        
        $previousHash = Cache::get($cacheKey, str_repeat('0', 64));

        $payloadToSign = json_encode([
            'tenant_id' => $tenantId,
            'user_id' => $this->request->user()?->getKey(),
            'module' => $module,
            'action' => $action,
            'resource' => $resource,
            'before' => $before,
            'after' => $after,
            'ip' => $this->request->ip(),
            'previous_hash' => $previousHash,
            'timestamp' => now()->toIso8601String(),
        ], JSON_THROW_ON_ERROR);

        $currentHash = hash_hmac('sha256', $payloadToSign, $this->hmacKey);

        Cache::put($cacheKey, $currentHash, now()->addDays(30));

        $mergedAfter = array_merge($after ?? [], [
            '_hmac_signature' => $currentHash,
            '_previous_hash' => $previousHash,
        ]);

        return AuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $this->request->user()?->getKey(),
            'module' => $module,
            'action' => $action,
            'resource' => $resource,
            'before' => $before,
            'after' => $mergedAfter,
            'ip' => $this->request->ip(),
            'user_agent' => $this->request->userAgent(),
            'created_at' => now(),
        ]);
    }

    /**
     * Valida a integridade da cadeia de auditoria
     */
    public function verifyChain(string $currentSignature, string $previousSignature, array $recordData): bool
    {
        $payloadToSign = json_encode(array_merge($recordData, [
            'previous_hash' => $previousSignature,
        ]), JSON_THROW_ON_ERROR);

        $expectedHash = hash_hmac('sha256', $payloadToSign, $this->hmacKey);

        return hash_equals($expectedHash, $currentSignature);
    }
}

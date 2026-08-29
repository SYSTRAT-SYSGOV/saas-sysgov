<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user(), 401);

        $slug = $request->header('X-Tenant-Slug');
        $tenantId = $request->header('X-Tenant-ID');

        abort_unless($slug || $tenantId, 403, 'Tenant não informado.');

        // 1. Tenta via tenant_user (vínculo direto do usuário ao tenant)
        $tenant = $request->user()->tenants()
            ->where('tenant_user.status', 'active')
            ->when($slug, fn ($q) => $q->where('tenants.slug', $slug))
            ->when($tenantId, fn ($q) => $q->where('tenants.id', (int) $tenantId))
            ->where('tenants.status', 'active')
            ->first();

        // 2. Analista de suporte: acesso via carteira (tenant_analyst) mesmo sem tenant_user
        if (!$tenant && $request->user()->isSupportAnalyst()) {
            $tenant = $request->user()->analystTenants()
                ->where('tenants.status', 'active')
                ->where(function ($q) {
                    $q->whereNull('tenant_analyst.expires_at')
                      ->orWhere('tenant_analyst.expires_at', '>', now());
                })
                ->when($slug, fn ($q) => $q->where('tenants.slug', $slug))
                ->when($tenantId, fn ($q) => $q->where('tenants.id', (int) $tenantId))
                ->first();
        }

        abort_unless($tenant instanceof Tenant, 403, 'Tenant inválido ou não associado ao usuário.');

        app(TenantContext::class)->set($tenant);

        try {
            return $next($request);
        } finally {
            app(TenantContext::class)->clear();
        }
    }
}

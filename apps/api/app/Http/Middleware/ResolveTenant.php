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

        $query = $request->user()->tenants()
            ->where('tenant_user.status', 'active');

        // Aceita X-Tenant-Slug (web-client clássico) OU X-Tenant-ID (id numérico)
        $slug = $request->header('X-Tenant-Slug');
        $tenantId = $request->header('X-Tenant-ID');

        if ($slug) {
            $query->where('tenants.slug', $slug);
        } elseif ($tenantId) {
            $query->where('tenants.id', (int) $tenantId);
        } else {
            abort(403, 'Tenant não informado.');
        }

        $tenant = $query->where('tenants.status', 'active')->first();

        abort_unless($tenant instanceof Tenant, 403, 'Tenant inválido ou não associado ao usuário.');

        app(TenantContext::class)->set($tenant);

        try {
            return $next($request);
        } finally {
            app(TenantContext::class)->clear();
        }
    }
}

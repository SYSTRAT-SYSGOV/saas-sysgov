<?php

declare(strict_types=1);

namespace Modules\Ata\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve o tenant da validação pública pelo slug da URL impressa no QR Code. Só vale para tenant ativo com o
 * módulo habilitado; qualquer outro caso responde 404. O slug só seleciona o tenant: não concede autorização.
 */
final class ResolveTenantPublicoAta
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Tenant::query()
            ->where('slug', (string) $request->route('tenantSlug'))
            ->where('status', 'active')
            ->whereHas('modules', fn ($q) => $q->where('alias', 'ata')->where('tenant_module.enabled', true))
            ->first();
        abort_unless($tenant instanceof Tenant, 404);

        $contexto = app(TenantContext::class);
        $contexto->set($tenant);
        try {
            $request->route()?->forgetParameter('tenantSlug');

            return $next($request);
        } finally {
            $contexto->clear();
        }
    }
}

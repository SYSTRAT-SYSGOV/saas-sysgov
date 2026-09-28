<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Modules\Cemiterios\Services\ParametroService;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve o município do portal pelo slug da URL (spec: portal › Identificação
 * do município). Só vale para tenant ativo, com o módulo habilitado e o portal
 * ligado nos parâmetros; qualquer outro caso responde 404. Não concede autorização.
 */
final class ResolveTenantPublico
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Tenant::query()
            ->where('slug', (string) $request->route('tenantSlug'))
            ->where('status', 'active')
            ->whereHas('modules', fn ($q) => $q->where('alias', 'cemiterios')->where('tenant_module.enabled', true))
            ->first();

        abort_unless($tenant instanceof Tenant, 404);

        $contexto = app(TenantContext::class);
        $contexto->set($tenant);

        try {
            abort_unless(app(ParametroService::class)->vigente()->portal_habilitado, 404);
            $request->route()?->forgetParameter('tenantSlug');

            return $next($request);
        } finally {
            $contexto->clear();
        }
    }
}

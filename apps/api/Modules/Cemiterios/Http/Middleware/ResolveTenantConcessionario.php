<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Modules\Cemiterios\Models\Concessionario;
use Symfony\Component\HttpFoundation\Response;

/** O token do concessionário só vale no portal do município que o emitiu (D8). */
final class ResolveTenantConcessionario
{
    public function handle(Request $request, Closure $next): Response
    {
        $titular = $request->user('concessionario');

        abort_unless(
            $titular instanceof Concessionario && (int) $titular->tenant_id === app(TenantContext::class)->id(),
            401
        );

        return $next($request);
    }
}

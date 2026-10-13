<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Modules\Inservivel\Services\ParametrosService;
use Symfony\Component\HttpFoundation\Response;

/** Cria os parâmetros padrão do tenant na primeira chamada do módulo (D2); depois só consulta o cache. */
final class GarantePadroesInservivel
{
    public function __construct(
        private readonly TenantContext $tenant,
        private readonly ParametrosService $parametros,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($this->tenant->hasTenant()) {
            $chave = 'inservivel:padroes:v1:' . $this->tenant->id();
            if (!Cache::has($chave)) {
                $this->parametros->garantirPadroes();
                Cache::forever($chave, true);
            }
        }

        return $next($request);
    }
}

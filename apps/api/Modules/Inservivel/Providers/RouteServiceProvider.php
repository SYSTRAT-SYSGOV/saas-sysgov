<?php

declare(strict_types=1);

namespace Modules\Inservivel\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Inservivel\Http\Middleware\EnsurePortalEntidade;
use Modules\Inservivel\Http\Middleware\GarantePadroesInservivel;
use Modules\Inservivel\Http\Middleware\ResolveTenantPublicoInservivel;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Cadastro público da entidade (sem login): ver o aviso em Routes/publico.php antes de mexer (D7).
        Route::middleware(['api', 'throttle:inservivel-publico', ResolveTenantPublicoInservivel::class])
            ->prefix('api/public/inservivel/{tenantSlug}')
            ->group(__DIR__ . '/../Routes/publico.php');

        // Sem o grupo 'api': ele traz o SubstituteBindings, que resolveria os {models} ANTES do 'tenant'
        // definir o TenantContext — o TenantAware ainda não filtraria. Aqui 'bindings' vem depois do 'tenant'.
        // Portal da entidade antes das rotas internas: o prefixo /portal não pode cair num {model} interno.
        // O portal não usa 'module-access' (exige inservivel.view): ver EnsurePortalEntidade.
        Route::middleware(['auth:sanctum', 'tenant', 'bindings', EnsurePortalEntidade::class, GarantePadroesInservivel::class])
            ->prefix('api/inservivel/portal')
            ->group(__DIR__ . '/../Routes/portal.php');

        Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:inservivel', GarantePadroesInservivel::class])
            ->prefix('api/inservivel')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

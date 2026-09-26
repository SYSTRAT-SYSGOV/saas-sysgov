<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Modules\Cemiterios\Http\Middleware\ResolveTenantConcessionario;
use Modules\Cemiterios\Http\Middleware\ResolveTenantPublico;

final class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // Portal anônimo: limite por IP (spec: portal › Proteção contra abuso).
        RateLimiter::for('cemiterios-publico', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        parent::boot();
    }

    public function map(): void
    {
        // Painel do órgão (D8).
        Route::middleware(['api', 'auth:sanctum', 'resolve.tenant', 'module-access:cemiterios'])
            ->prefix('api/cemiterios')
            ->group(__DIR__ . '/../Routes/api.php');

        // Portal público: o slug só seleciona dados públicos de tenant com portal habilitado.
        Route::middleware(['api', 'throttle:cemiterios-publico', ResolveTenantPublico::class])
            ->prefix('api/public/cemiterios/{tenantSlug}')
            ->group(__DIR__ . '/../Routes/public.php');

        // Portal do concessionário: login Gov.br aberto; o restante exige o guard próprio.
        Route::middleware(['api', 'throttle:cemiterios-publico', ResolveTenantPublico::class])
            ->prefix('api/portal/cemiterios/{tenantSlug}')
            ->group(function (): void {
                require __DIR__ . '/../Routes/portal-auth.php';

                Route::middleware(['auth:concessionario', ResolveTenantConcessionario::class])
                    ->group(__DIR__ . '/../Routes/portal.php');
            });
    }
}

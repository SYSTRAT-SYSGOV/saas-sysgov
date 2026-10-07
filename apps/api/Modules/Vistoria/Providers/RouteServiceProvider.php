<?php

declare(strict_types=1);

namespace Modules\Vistoria\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Integração M2M (seção 14.3) — token de API dedicado, sem login humano. Mesmo
        // padrão de Modules\Capd\Providers\RouteServiceProvider (rh-gateway/embed): rota
        // separada, só com o middleware `api`, nunca `auth:sanctum`/`resolve.tenant`.
        Route::middleware(['api'])
            ->prefix('api/vistoria')
            ->group(__DIR__ . '/../Routes/integracao.php');

        Route::middleware(['api', 'auth:sanctum', 'resolve.tenant', 'module-access:vistoria'])
            ->prefix('api/vistoria')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

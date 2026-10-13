<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Fase 11 — docs e API M2M: só middleware `api`, nunca `auth:sanctum`/`resolve.tenant`
        // (mesmo padrão de Modules\Vistoria\Providers\RouteServiceProvider).
        Route::middleware(['api'])
            ->prefix('api/meio_ambiente')
            ->group(__DIR__ . '/../Routes/publico.php');

        Route::middleware(['api', 'auth:sanctum', 'resolve.tenant', 'module-access:meio_ambiente'])
            ->prefix('api/meio_ambiente')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
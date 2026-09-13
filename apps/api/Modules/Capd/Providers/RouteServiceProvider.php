<?php

declare(strict_types=1);

namespace Modules\Capd\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Gateway de Integração de RH (Autenticação por X-RH-API-Key)
        Route::middleware(['api'])
            ->prefix('api/capd/rh-gateway')
            ->group(__DIR__ . '/../Routes/rh.php');

        // Injeção em Sistemas Terceiros (Autenticação por Embed Token)
        Route::middleware(['api'])
            ->prefix('api/capd/embed')
            ->group(__DIR__ . '/../Routes/embed.php');

        // Rotas autenticadas do sistema
        Route::middleware(['api', 'auth:sanctum', 'resolve.tenant'])
            ->prefix('api/capd')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
<?php

declare(strict_types=1);

namespace Modules\Escola\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Sem o grupo 'api': ele traz o SubstituteBindings, que resolveria os {models} ANTES do 'tenant'
        // definir o TenantContext — o TenantAware ainda não filtraria. Aqui 'bindings' vem depois do 'tenant'.
        // Escolas do órgão: antes do grupo com 'escola' (é onde se escolhe a escola de trabalho).
        Route::middleware(['auth:sanctum', 'tenant', 'bindings'])
            ->prefix('api/escola')
            ->group(__DIR__ . '/../Routes/escolas.php');

        Route::middleware(['auth:sanctum', 'tenant', 'escola:escola', 'bindings', 'module-access:escola'])
            ->prefix('api/escola')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

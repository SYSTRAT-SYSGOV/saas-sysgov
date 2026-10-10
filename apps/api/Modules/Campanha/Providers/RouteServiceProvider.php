<?php

declare(strict_types=1);

namespace Modules\Campanha\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Formulário público de captação (sem login): ver o aviso em Routes/publico.php antes de mexer.
        Route::middleware(['api', 'throttle:campanha-publico'])
            ->prefix('api/public/campanha')
            ->group(__DIR__ . '/../Routes/publico.php');

        // Sem o grupo 'api': ele traz o SubstituteBindings, que resolveria os {models} ANTES do 'tenant'
        // definir o TenantContext — o TenantAware ainda não filtraria. Aqui 'bindings' vem depois do 'tenant'.
        // Campanhas do tenant: antes do grupo com 'campanha' (é onde se escolhe a campanha de trabalho).
        Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:campanha'])
            ->prefix('api/campanha')
            ->group(__DIR__ . '/../Routes/campanhas.php');

        Route::middleware(['auth:sanctum', 'tenant', 'campanha', 'bindings', 'module-access:campanha'])
            ->prefix('api/campanha')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

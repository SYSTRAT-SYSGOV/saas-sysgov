<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Sem o grupo 'api': ele traz o SubstituteBindings, que resolveria os {models} ANTES do 'tenant'
        // definir o TenantContext — o TenantAware ainda não filtraria. Aqui 'bindings' vem depois do 'tenant'.
        Route::middleware(['auth:sanctum', 'tenant', 'escola:pedagogico', 'bindings', 'module-access:pedagogico'])
            ->prefix('api/pedagogico')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

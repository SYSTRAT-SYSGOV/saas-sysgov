<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // 'bindings' depois do 'tenant': os {models} só são resolvidos com o TenantContext já definido.
        Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:multiprofissional'])
            ->prefix('api/multiprofissional')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

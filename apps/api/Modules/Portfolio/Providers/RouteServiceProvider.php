<?php

declare(strict_types=1);

namespace Modules\Portfolio\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // 'bindings' depois de 'tenant' e 'escola': o TenantAware/EscolaAware já filtram ao resolver {models}.
        Route::middleware(['auth:sanctum', 'tenant', 'escola:portfolio', 'bindings', 'module-access:portfolio'])
            ->prefix('api/portfolio')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

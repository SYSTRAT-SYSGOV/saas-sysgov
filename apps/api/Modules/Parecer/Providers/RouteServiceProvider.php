<?php

declare(strict_types=1);

namespace Modules\Parecer\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Mesmo pipeline do Pedagógico: 'bindings' depois de 'tenant' e 'escola' para os {models}
        // TenantAware/EscolaAware já resolverem filtrados (registro de outro tenant/escola vira 404).
        Route::middleware(['auth:sanctum', 'tenant', 'escola:parecer', 'bindings', 'module-access:parecer'])
            ->prefix('api/parecer')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        parent::boot();
    }

    public function map(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'tenant', 'bindings', 'module-access:educa'])
            ->prefix('api/educa')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
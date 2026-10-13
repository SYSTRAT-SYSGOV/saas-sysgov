<?php

declare(strict_types=1);

namespace Modules\Protocolo\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'resolve.tenant'])
            ->prefix('api/protocolo')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}
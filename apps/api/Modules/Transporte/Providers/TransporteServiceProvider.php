<?php

declare(strict_types=1);

namespace Modules\Transporte\Providers;

use Illuminate\Support\ServiceProvider;

final class TransporteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

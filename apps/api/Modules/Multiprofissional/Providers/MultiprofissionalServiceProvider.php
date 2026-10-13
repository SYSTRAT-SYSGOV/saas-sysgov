<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Providers;

use Illuminate\Support\ServiceProvider;

final class MultiprofissionalServiceProvider extends ServiceProvider
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
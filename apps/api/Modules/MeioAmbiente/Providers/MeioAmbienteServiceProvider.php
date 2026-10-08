<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Providers;

use Illuminate\Support\ServiceProvider;

final class MeioAmbienteServiceProvider extends ServiceProvider
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
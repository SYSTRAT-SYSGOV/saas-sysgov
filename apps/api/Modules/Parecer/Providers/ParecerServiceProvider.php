<?php

declare(strict_types=1);

namespace Modules\Parecer\Providers;

use Illuminate\Support\ServiceProvider;
use Modules\Parecer\Services\AcessoParecer;

final class ParecerServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        AcessoParecer::registrarGates();
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

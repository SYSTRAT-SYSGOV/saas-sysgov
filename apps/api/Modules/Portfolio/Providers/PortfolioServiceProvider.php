<?php

declare(strict_types=1);

namespace Modules\Portfolio\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Policies\TrabalhoPolicy;

final class PortfolioServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        $this->loadViewsFrom(__DIR__ . '/../Resources/views', 'portfolio');

        Gate::policy(Trabalho::class, TrabalhoPolicy::class);
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

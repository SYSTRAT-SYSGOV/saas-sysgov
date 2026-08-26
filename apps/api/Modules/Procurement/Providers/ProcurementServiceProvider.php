<?php

declare(strict_types=1);

namespace Modules\Procurement\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Policies\LicitacaoPolicy;

final class ProcurementServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/config.php', 'procurement');
    }

    public function boot(): void
    {
        Gate::policy(Licitacao::class, LicitacaoPolicy::class);

        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        if (file_exists(__DIR__.'/../Routes/api.php')) {
            $this->loadRoutesFrom(__DIR__.'/../Routes/api.php');
        }
    }
}

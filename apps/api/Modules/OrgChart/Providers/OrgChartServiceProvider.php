<?php

declare(strict_types=1);

namespace Modules\OrgChart\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Policies\OrgUnitPolicy;

final class OrgChartServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/config.php', 'org');
    }

    public function boot(): void
    {
        Gate::policy(OrgUnit::class, OrgUnitPolicy::class);

        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        
        if (file_exists(__DIR__.'/../Routes/api.php')) {
            $this->loadRoutesFrom(__DIR__.'/../Routes/api.php');
        }
        
        if (file_exists(__DIR__.'/../Routes/admin.php')) {
            $this->loadRoutesFrom(__DIR__.'/../Routes/admin.php');
        }
    }
}

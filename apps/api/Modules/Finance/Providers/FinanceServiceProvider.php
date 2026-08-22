<?php

declare(strict_types=1);

namespace Modules\Finance\Providers;

use Illuminate\Support\ServiceProvider;

final class FinanceServiceProvider extends ServiceProvider
{
    public function boot(): void { $this->loadRoutesFrom(__DIR__.'/../Routes/api.php'); $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations'); }
}

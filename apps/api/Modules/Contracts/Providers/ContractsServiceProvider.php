<?php

declare(strict_types=1);

namespace Modules\Contracts\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Contracts\Models\Contract;
use Modules\Contracts\Policies\ContractPolicy;

final class ContractsServiceProvider extends ServiceProvider
{
    public function boot(): void { Gate::policy(Contract::class, ContractPolicy::class); $this->loadRoutesFrom(__DIR__.'/../Routes/api.php'); $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations'); }
}

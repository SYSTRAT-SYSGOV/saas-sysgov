<?php

declare(strict_types=1);

namespace Modules\Admin\Providers;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;
use Modules\Admin\Models\Module;
use Modules\Admin\Models\SaasContract;
use Modules\Admin\Models\SaasInvoice;
use Modules\Admin\Policies\MenuGroupPolicy;
use Modules\Admin\Policies\MenuItemPolicy;
use Modules\Admin\Policies\ModulePolicy;
use Modules\Admin\Policies\SaasContractPolicy;
use Modules\Admin\Policies\SaasInvoicePolicy;
use Modules\Admin\Policies\TenantPolicy;
use Modules\Admin\Policies\UserPolicy;

final class AdminServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                \Modules\Admin\Console\Commands\SeedMenusCommand::class,
            ]);
        }
        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Module::class, ModulePolicy::class);
        Gate::policy(SaasContract::class, SaasContractPolicy::class);
        Gate::policy(SaasInvoice::class, SaasInvoicePolicy::class);
        Gate::policy(MenuGroup::class, MenuGroupPolicy::class);
        Gate::policy(MenuItem::class, MenuItemPolicy::class);
        $this->loadRoutesFrom(__DIR__.'/../Routes/api.php');
    }
}


<?php

declare(strict_types=1);

namespace Modules\Admin\Providers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;
use Modules\Admin\Models\Module;
use Modules\Admin\Models\SaasContract;
use Modules\Admin\Models\SaasInvoice;
use Modules\Admin\Policies\InvitationPolicy;
use Modules\Admin\Policies\MenuGroupPolicy;
use Modules\Admin\Policies\MenuItemPolicy;
use Modules\Admin\Policies\ModulePolicy;
use Modules\Admin\Policies\PermissionPolicy;
use Modules\Admin\Policies\RolePolicy;
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
                \Modules\Admin\Console\Commands\SetupMfaCommand::class,
            ]);
        }

        // Policies do módulo Admin
        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(Permission::class, PermissionPolicy::class);
        Gate::policy(UserInvitation::class, InvitationPolicy::class);
        Gate::policy(Module::class, ModulePolicy::class);
        Gate::policy(SaasContract::class, SaasContractPolicy::class);
        Gate::policy(SaasInvoice::class, SaasInvoicePolicy::class);
        Gate::policy(MenuGroup::class, MenuGroupPolicy::class);
        Gate::policy(MenuItem::class, MenuItemPolicy::class);

        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');
        $this->loadRoutesFrom(__DIR__.'/../Routes/api.php');

        if (file_exists(__DIR__.'/../Routes/client-api.php')) {
            $this->loadRoutesFrom(__DIR__.'/../Routes/client-api.php');
        }

        // Carrega rotas e providers do módulo Client (web-client menus)
        $this->app->register(\Modules\Client\Providers\ClientServiceProvider::class);
    }
}


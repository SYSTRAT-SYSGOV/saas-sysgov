<?php

declare(strict_types=1);

namespace Modules\Admin\Providers;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Admin\Models\Module;
use Modules\Admin\Policies\ModulePolicy;
use Modules\Admin\Policies\TenantPolicy;
use Modules\Admin\Policies\UserPolicy;

final class AdminServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
        Gate::policy(Module::class, ModulePolicy::class);
        $this->loadRoutesFrom(__DIR__.'/../Routes/api.php');
    }
}

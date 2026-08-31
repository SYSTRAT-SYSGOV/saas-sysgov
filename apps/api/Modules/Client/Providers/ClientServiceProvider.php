<?php

declare(strict_types=1);

namespace Modules\Client\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;
use Modules\Client\Policies\ClientMenuGroupPolicy;
use Modules\Client\Policies\ClientMenuItemPolicy;

final class ClientServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }

    public function boot(): void
    {
        Gate::policy(ClientMenuGroup::class, ClientMenuGroupPolicy::class);
        Gate::policy(ClientMenuItem::class, ClientMenuItemPolicy::class);
        $this->loadMigrationsFrom(__DIR__ . '/../../database/migrations');
        $this->loadRoutesFrom(__DIR__ . '/../Routes/client-api.php');
    }
}

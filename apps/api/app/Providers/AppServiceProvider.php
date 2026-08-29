<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\TenantContext;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

final class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
    }

    public function boot(): void
    {
        // A coluna roles.slug/scope é NOT NULL sem default. Garante que qualquer criação
        // de role via Spatie (que não seta esses campos) receba valores automáticos.
        Event::listen('eloquent.creating: ' . Role::class, function (Role $role): void {
            if (blank($role->slug)) {
                $role->slug = Str::slug($role->name);
            }
            if (blank($role->scope)) {
                $role->scope = 'tenant';
            }
        });
    }
}

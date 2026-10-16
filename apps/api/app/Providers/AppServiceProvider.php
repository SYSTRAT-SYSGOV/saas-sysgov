<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
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
        // Login, recuperação de senha, MFA e convites: 10 tentativas/min por IP+e-mail, 30/min por IP.
        RateLimiter::for('auth-sensivel', fn (Request $request) => [
            Limit::perMinute(10)->by('auth:' . $request->ip() . '|' . strtolower((string) $request->input('email'))),
            Limit::perMinute(30)->by('auth-ip:' . $request->ip()),
        ]);

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

<?php

declare(strict_types=1);

namespace Modules\Ata\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Modules\Ata\Models\Ata;
use Modules\Ata\Policies\AtaPolicy;

final class AtaServiceProvider extends ServiceProvider
{
    /** Validação pública do documento: consultas por IP por minuto. */
    public const LIMITE_VALIDACAO_POR_MINUTO = 30;

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        $this->loadViewsFrom(__DIR__ . '/../Resources/views', 'ata');

        Gate::policy(Ata::class, AtaPolicy::class);

        RateLimiter::for('ata-publico', fn (Request $request) => Limit::perMinute(self::LIMITE_VALIDACAO_POR_MINUTO)->by($request->ip()));
    }

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'ata');
        $this->app->register(RouteServiceProvider::class);
    }
}

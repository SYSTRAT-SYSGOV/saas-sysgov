<?php

declare(strict_types=1);

namespace Modules\Passeio\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Models\Veiculo;
use Modules\Passeio\Policies\InscricaoPolicy;
use Modules\Passeio\Policies\PasseioPolicy;
use Modules\Passeio\Policies\VeiculoPolicy;

final class PasseioServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Gate::policy(Passeio::class, PasseioPolicy::class);
        Gate::policy(Inscricao::class, InscricaoPolicy::class);
        Gate::policy(Veiculo::class, VeiculoPolicy::class);
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

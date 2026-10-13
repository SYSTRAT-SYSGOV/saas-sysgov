<?php

declare(strict_types=1);

namespace Modules\Formatura\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Formatura\Models\Configuracao;
use Modules\Formatura\Models\Pagamento;
use Modules\Formatura\Models\Participacao;
use Modules\Formatura\Policies\ConfiguracaoPolicy;
use Modules\Formatura\Policies\PagamentoPolicy;
use Modules\Formatura\Policies\ParticipacaoPolicy;

final class FormaturaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Gate::policy(Configuracao::class, ConfiguracaoPolicy::class);
        Gate::policy(Participacao::class, ParticipacaoPolicy::class);
        Gate::policy(Pagamento::class, PagamentoPolicy::class);
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

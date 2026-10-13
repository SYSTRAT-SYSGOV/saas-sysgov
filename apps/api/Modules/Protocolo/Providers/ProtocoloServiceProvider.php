<?php

declare(strict_types=1);

namespace Modules\Protocolo\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Models\TipoTramitacao;
use Modules\Protocolo\Policies\ProcessoPolicy;
use Modules\Protocolo\Policies\TipoTramitacaoPolicy;
use Modules\Protocolo\Services\NumeracaoService;
use Modules\Protocolo\Services\ProcessoService;

final class ProtocoloServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Processo::class, ProcessoPolicy::class);
        Gate::policy(TipoTramitacao::class, TipoTramitacaoPolicy::class);

        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        if ($this->app->runningInConsole()) {
            $this->commands([
                \Modules\Protocolo\Console\SeedTiposTramitacaoCommand::class,
            ]);
        }
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);

        $this->app->singleton(NumeracaoService::class);
        $this->app->singleton(ProcessoService::class);
        $this->app->singleton(\Modules\Protocolo\Services\TramitacaoService::class);
        $this->app->singleton(\Modules\Protocolo\Services\VinculoRegistry::class);
        $this->app->singleton(\Modules\Protocolo\Services\PromocaoService::class);
    }
}
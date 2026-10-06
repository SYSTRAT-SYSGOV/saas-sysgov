<?php

declare(strict_types=1);

namespace Modules\Vistoria\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Policies\ExecucaoVistoriaPolicy;
use Modules\Vistoria\Policies\FormularioPolicy;
use Modules\Vistoria\Policies\LocalFiscalizavelPolicy;
use Modules\Vistoria\Policies\OrdemServicoPolicy;

final class VistoriaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Gate::policy(LocalFiscalizavel::class, LocalFiscalizavelPolicy::class);
        Gate::policy(OrdemServico::class, OrdemServicoPolicy::class);
        Gate::policy(ExecucaoVistoria::class, ExecucaoVistoriaPolicy::class);
        Gate::policy(ModeloFormulario::class, FormularioPolicy::class);

        // Gate::policy() para as demais entidades é registrado aqui conforme a
        // respectiva Policy é criada (ver tasks.md 7.3, 9.*).
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

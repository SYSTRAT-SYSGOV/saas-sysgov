<?php

declare(strict_types=1);

namespace Modules\Vistoria\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Vistoria\Jobs\VerificarPrazosProcessoJob;
use Modules\Vistoria\Jobs\VerificarPrazosReinspecaoJob;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\Evidencia;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Models\Reinspecao;
use Modules\Vistoria\Policies\DocumentoPolicy;
use Modules\Vistoria\Policies\EvidenciaPolicy;
use Modules\Vistoria\Policies\ExecucaoVistoriaPolicy;
use Modules\Vistoria\Policies\FormularioPolicy;
use Modules\Vistoria\Policies\LocalFiscalizavelPolicy;
use Modules\Vistoria\Policies\OrdemServicoPolicy;
use Modules\Vistoria\Policies\ProcessoSancionatorioPolicy;
use Modules\Vistoria\Policies\ReinspecaoPolicy;

final class VistoriaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Gate::policy(LocalFiscalizavel::class, LocalFiscalizavelPolicy::class);
        Gate::policy(OrdemServico::class, OrdemServicoPolicy::class);
        Gate::policy(ExecucaoVistoria::class, ExecucaoVistoriaPolicy::class);
        Gate::policy(ModeloFormulario::class, FormularioPolicy::class);
        Gate::policy(Documento::class, DocumentoPolicy::class);
        Gate::policy(Evidencia::class, EvidenciaPolicy::class);
        Gate::policy(ProcessoSancionatorio::class, ProcessoSancionatorioPolicy::class);
        Gate::policy(Reinspecao::class, ReinspecaoPolicy::class);

        // Gate::policy() para as demais entidades é registrado aqui conforme a
        // respectiva Policy é criada (ver tasks.md 12.*, 13.*).

        if ($this->app->runningInConsole()) {
            $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
                $schedule->job(VerificarPrazosProcessoJob::class)
                    ->dailyAt('06:00')
                    ->timezone('America/Sao_Paulo')
                    ->withoutOverlapping()
                    ->onOneServer();

                $schedule->job(VerificarPrazosReinspecaoJob::class)
                    ->dailyAt('06:15')
                    ->timezone('America/Sao_Paulo')
                    ->withoutOverlapping()
                    ->onOneServer();
            });
        }
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

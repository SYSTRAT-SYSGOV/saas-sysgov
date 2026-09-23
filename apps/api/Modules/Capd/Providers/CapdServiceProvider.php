<?php

declare(strict_types=1);

namespace Modules\Capd\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\ServiceProvider;

final class CapdServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        \Illuminate\Support\Facades\Gate::policy(\Modules\Capd\Models\Avaliacao::class, \Modules\Capd\Policies\AvaliacaoPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Modules\Capd\Models\DiarioBordo::class, \Modules\Capd\Policies\DiarioBordoPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Modules\Capd\Models\Recurso::class, \Modules\Capd\Policies\RecursoPolicy::class);

        \Illuminate\Support\Facades\Event::listen(
            \Modules\Capd\Events\AvaliacaoHomologada::class,
            \Modules\Capd\Listeners\RecalcularNotaConsolidada::class,
        );
        \Illuminate\Support\Facades\Event::listen(
            \Modules\Capd\Events\CicloOpened::class,
            \Modules\Capd\Listeners\SendCycleNotification::class,
        );

        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        if ($this->app->runningInConsole()) {
            $this->commands([
                \Modules\Capd\Console\AlertarPrazoAvaliacao::class,
                \Modules\Capd\Console\TransicionarEtapaCiclo::class,
            ]);

            $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
                $schedule->command(\Modules\Capd\Console\AlertarPrazoAvaliacao::class)
                    ->dailyAt('07:00')->timezone('America/Sao_Paulo')->withoutOverlapping()->onOneServer();
                $schedule->command(\Modules\Capd\Console\TransicionarEtapaCiclo::class)
                    ->dailyAt('00:15')->timezone('America/Sao_Paulo')->withoutOverlapping()->onOneServer();
            });
        }
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);

        $this->app->singleton(\Modules\Capd\Services\IngestaoAutomaticaService::class, function () {
            $manualAdapter = new \Modules\Capd\Services\Adapters\ManualHrAdapter();
            return new \Modules\Capd\Services\IngestaoAutomaticaService([
                $manualAdapter->identificador() => $manualAdapter,
            ]);
        });
    }
}
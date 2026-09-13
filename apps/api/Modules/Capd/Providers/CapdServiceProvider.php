<?php

declare(strict_types=1);

namespace Modules\Capd\Providers;

use Illuminate\Support\ServiceProvider;

final class CapdServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        \Illuminate\Support\Facades\Gate::policy(\Modules\Capd\Models\Avaliacao::class, \Modules\Capd\Policies\AvaliacaoPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Modules\Capd\Models\DiarioBordo::class, \Modules\Capd\Policies\DiarioBordoPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Modules\Capd\Models\Recurso::class, \Modules\Capd\Policies\RecursoPolicy::class);

        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
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
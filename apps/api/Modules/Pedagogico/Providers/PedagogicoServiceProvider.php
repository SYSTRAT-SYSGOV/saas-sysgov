<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Pedagogico\Models\Ata;
use Modules\Pedagogico\Models\Cronograma;
use Modules\Pedagogico\Models\Ocorrencia;
use Modules\Pedagogico\Models\PreConselho;
use Modules\Pedagogico\Policies\AcessoPedagogico;
use Modules\Pedagogico\Policies\AtaPolicy;
use Modules\Pedagogico\Policies\CronogramaPolicy;
use Modules\Pedagogico\Policies\OcorrenciaPolicy;
use Modules\Pedagogico\Policies\PreConselhoPolicy;
use Modules\Pedagogico\Services\EscopoProfessor;

final class PedagogicoServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Gate::policy(Ocorrencia::class, OcorrenciaPolicy::class);
        Gate::policy(PreConselho::class, PreConselhoPolicy::class);
        Gate::policy(Ata::class, AtaPolicy::class);
        Gate::policy(Cronograma::class, CronogramaPolicy::class);

        // Abilities por turma × matéria (escopo do professor, design D6).
        Gate::define('pedagogico.ver-turma', [AcessoPedagogico::class, 'verTurma']);
        Gate::define('pedagogico.lancar-nota', [AcessoPedagogico::class, 'lancarNota']);
        Gate::define('pedagogico.preencher-ficha', [AcessoPedagogico::class, 'preencherFicha']);
        Gate::define('pedagogico.registrar-frequencia', [AcessoPedagogico::class, 'registrarFrequencia']);
        Gate::define('pedagogico.gerir-notas', fn ($user): bool => app(EscopoProfessor::class)->pode($user, 'pedagogico.notas.manage'));
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

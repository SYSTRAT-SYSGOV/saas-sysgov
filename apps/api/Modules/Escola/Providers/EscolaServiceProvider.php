<?php

declare(strict_types=1);

namespace Modules\Escola\Providers;

use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Escola\Http\Middleware\ResolveEscola;
use Modules\Escola\Listeners\AtualizarAlunosDaPessoa;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Models\Unidade;
use Modules\Escola\Policies\AlunoPolicy;
use Modules\Escola\Policies\EscolaPolicy;
use Modules\Escola\Policies\CategoriaOcorrenciaPolicy;
use Modules\Escola\Policies\MateriaPolicy;
use Modules\Escola\Policies\MembroEquipePolicy;
use Modules\Escola\Policies\TrimestrePolicy;
use Modules\Escola\Policies\TurmaPolicy;
use Modules\Escola\Policies\TurnoPolicy;
use Modules\Escola\Policies\UnidadePolicy;
use Modules\Escola\Support\EscolaContext;

final class EscolaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        if ($this->app->runningInConsole()) {
            $this->commands([\Modules\Escola\Console\RessincronizarPessoasCommand::class]);
        }

        // Escola de trabalho da requisição (usado também por Pedagógico, Formatura e Passeio).
        $this->app->make(Router::class)->aliasMiddleware('escola', ResolveEscola::class);

        Event::listen(\Modules\Pessoas\Events\PessoaAtualizada::class, AtualizarAlunosDaPessoa::class);

        Gate::policy(Escola::class, EscolaPolicy::class);
        Gate::policy(Unidade::class, UnidadePolicy::class);
        Gate::policy(MembroEquipe::class, MembroEquipePolicy::class);
        Gate::policy(Turno::class, TurnoPolicy::class);
        Gate::policy(Turma::class, TurmaPolicy::class);
        Gate::policy(Aluno::class, AlunoPolicy::class);
        Gate::policy(Materia::class, MateriaPolicy::class);
        Gate::policy(Trimestre::class, TrimestrePolicy::class);
        Gate::policy(CategoriaOcorrencia::class, CategoriaOcorrenciaPolicy::class);
    }

    public function register(): void
    {
        // Singleton como o TenantContext: o middleware define e limpa a escola a cada requisição.
        $this->app->singleton(EscolaContext::class);
        $this->app->register(RouteServiceProvider::class);
    }
}

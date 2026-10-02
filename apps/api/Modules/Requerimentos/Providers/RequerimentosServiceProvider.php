<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Providers;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Requerimentos\Events\PrazoProximo;
use Modules\Requerimentos\Events\PrazoVencido;
use Modules\Requerimentos\Events\ProposicaoCriada;
use Modules\Requerimentos\Events\ProposicaoStatusChanged;
use Modules\Requerimentos\Events\TramitacaoEncaminhada;
use Modules\Requerimentos\Events\TramitacaoRecebida;
use Modules\Requerimentos\Events\TramitacaoRespondida;
use Modules\Requerimentos\Listeners\EnviarNotificacaoPrazoProximo;
use Modules\Requerimentos\Listeners\EnviarNotificacaoPrazoVencido;
use Modules\Requerimentos\Listeners\EnviarNotificacaoProposicaoCriada;
use Modules\Requerimentos\Listeners\EnviarNotificacaoTramitacaoEncaminhada;
use Modules\Requerimentos\Listeners\EnviarNotificacaoTramitacaoRespondida;
use Modules\Requerimentos\Listeners\RegistrarAuditoriaTramitacao;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\TramitacaoPoderes;
use Modules\Requerimentos\Policies\ProposicaoPolicy;
use Modules\Requerimentos\Policies\TramitacaoPoderesPolicy;
use Modules\Requerimentos\Support\DadoPessoalMasker;

final class RequerimentosServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        // ── Policies ──────────────────────────────────────────────────
        Gate::policy(Proposicao::class, ProposicaoPolicy::class);
        Gate::policy(TramitacaoPoderes::class, TramitacaoPoderesPolicy::class);

        // ── Event Listeners ───────────────────────────────────────────
        Event::listen(ProposicaoCriada::class, EnviarNotificacaoProposicaoCriada::class);
        Event::listen(ProposicaoStatusChanged::class, RegistrarAuditoriaTramitacao::class);
        Event::listen(TramitacaoEncaminhada::class, EnviarNotificacaoTramitacaoEncaminhada::class);
        Event::listen(TramitacaoEncaminhada::class, RegistrarAuditoriaTramitacao::class);
        Event::listen(TramitacaoRecebida::class, RegistrarAuditoriaTramitacao::class);
        Event::listen(TramitacaoRespondida::class, EnviarNotificacaoTramitacaoRespondida::class);
        Event::listen(TramitacaoRespondida::class, RegistrarAuditoriaTramitacao::class);
        Event::listen(PrazoProximo::class, EnviarNotificacaoPrazoProximo::class);
        Event::listen(PrazoVencido::class, EnviarNotificacaoPrazoVencido::class);
        Event::listen(PrazoVencido::class, RegistrarAuditoriaTramitacao::class);

        // ── Migrations ────────────────────────────────────────────────
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        // ── Scheduler ─────────────────────────────────────────────────
        if ($this->app->runningInConsole()) {
            $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
                $schedule->job(\Modules\Requerimentos\Jobs\VerificarPrazosJob::class)
                    ->dailyAt('06:00')
                    ->timezone('America/Sao_Paulo')
                    ->withoutOverlapping()
                    ->onOneServer();
            });
        }
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);

        $this->app->singleton(\Modules\Requerimentos\Services\ProposicaoService::class);
        $this->app->singleton(\Modules\Requerimentos\Services\TramitacaoPoderesService::class);
        $this->app->singleton(\Modules\Requerimentos\Services\RespostaService::class);
        $this->app->singleton(DadoPessoalMasker::class);
    }
}
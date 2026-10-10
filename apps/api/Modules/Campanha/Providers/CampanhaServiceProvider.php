<?php

declare(strict_types=1);

namespace Modules\Campanha\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Campanha\Console\AnonimizarEleitoresCommand;
use Modules\Campanha\Console\ImportarReferenciaCommand;
use Modules\Campanha\Http\Middleware\ResolveCampanha;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Policies\CampanhaPolicy;
use Modules\Campanha\Support\CampanhaContext;

final class CampanhaServiceProvider extends ServiceProvider
{
    /** Formulário público: consultas e envios por IP por minuto (D2). */
    public const LIMITE_PUBLICO_POR_MINUTO = 30;

    public const LIMITE_CADASTROS_POR_MINUTO = 5;

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        $this->app->make(Router::class)->aliasMiddleware('campanha', ResolveCampanha::class);

        Gate::policy(Campanha::class, CampanhaPolicy::class);
        Gate::policy(\Modules\Campanha\Models\MunicipioCampanha::class, \Modules\Campanha\Policies\MunicipioCampanhaPolicy::class);
        foreach ([\Modules\Campanha\Models\Coordenador::class, \Modules\Campanha\Models\CaboEleitoral::class, \Modules\Campanha\Models\PrefeitoRelacao::class, \Modules\Campanha\Models\Vereador::class] as $modelo) {
            Gate::policy($modelo, \Modules\Campanha\Policies\EquipePolicy::class);
        }

        Gate::policy(\Modules\Campanha\Models\LinkCaptacao::class, \Modules\Campanha\Policies\LinkCaptacaoPolicy::class);
        Gate::policy(\Modules\Campanha\Models\Eleitor::class, \Modules\Campanha\Policies\EleitorPolicy::class);
        Gate::policy(\Modules\Campanha\Models\Demanda::class, \Modules\Campanha\Policies\DemandaPolicy::class);
        $policies2b = [
            \Modules\Campanha\Models\Material::class => \Modules\Campanha\Policies\MaterialPolicy::class,
            \Modules\Campanha\Models\Remessa::class => \Modules\Campanha\Policies\MaterialPolicy::class,
            \Modules\Campanha\Models\Lancamento::class => \Modules\Campanha\Policies\LancamentoPolicy::class,
            \Modules\Campanha\Models\Evento::class => \Modules\Campanha\Policies\AgendaPolicy::class,
            \Modules\Campanha\Models\Reuniao::class => \Modules\Campanha\Policies\AgendaPolicy::class,
            \Modules\Campanha\Models\Visita::class => \Modules\Campanha\Policies\AgendaPolicy::class,
            \Modules\Campanha\Models\Pesquisa::class => \Modules\Campanha\Policies\PesquisaPolicy::class,
        ];
        foreach ($policies2b as $modelo => $policy) {
            Gate::policy($modelo, $policy);
        }

        RateLimiter::for('campanha-publico', fn (Request $request) => Limit::perMinute(self::LIMITE_PUBLICO_POR_MINUTO)->by((string) $request->ip()));
        RateLimiter::for('campanha-cadastro', fn (Request $request) => Limit::perMinute(self::LIMITE_CADASTROS_POR_MINUTO)->by((string) $request->ip()));

        if ($this->app->runningInConsole()) {
            $this->commands([ImportarReferenciaCommand::class, AnonimizarEleitoresCommand::class]);

            // LGPD (D5): anonimiza diariamente os eleitores das campanhas com prazo de retenção vencido.
            $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
                $schedule->command(AnonimizarEleitoresCommand::class)
                    ->dailyAt('02:30')->timezone('America/Sao_Paulo')->withoutOverlapping()->onOneServer();
            });
        }
    }

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'campanha');
        $this->app->singleton(CampanhaContext::class);
        $this->app->register(RouteServiceProvider::class);
    }
}

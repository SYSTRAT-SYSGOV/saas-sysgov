<?php

declare(strict_types=1);

namespace Modules\Inservivel\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Models\Categoria;
use Modules\Inservivel\Models\Configuracao;
use Modules\Inservivel\Models\Entidade;
use Modules\Inservivel\Models\EstadoConservacao;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Models\Situacao;
use Modules\Inservivel\Models\Transferencia;
use Modules\Inservivel\Policies\BemPolicy;
use Modules\Inservivel\Policies\EntidadePolicy;
use Modules\Inservivel\Policies\LotePolicy;
use Modules\Inservivel\Policies\ParametroPolicy;
use Modules\Inservivel\Policies\TransferenciaPolicy;

final class InservivelServiceProvider extends ServiceProvider
{
    /** Cadastro público (D7): consultas e envios por IP por minuto. */
    public const LIMITE_PUBLICO_POR_MINUTO = 60;

    public const LIMITE_CADASTROS_POR_MINUTO = 10;

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        $this->loadViewsFrom(__DIR__ . '/../Resources/views', 'inservivel');

        Gate::policy(Bem::class, BemPolicy::class);
        Gate::policy(Lote::class, LotePolicy::class);
        Gate::policy(Entidade::class, EntidadePolicy::class);
        Gate::policy(Transferencia::class, TransferenciaPolicy::class);
        foreach ([Categoria::class, Situacao::class, EstadoConservacao::class, Configuracao::class] as $modelo) {
            Gate::policy($modelo, ParametroPolicy::class);
        }

        RateLimiter::for('inservivel-publico', function (Request $request) {
            $limite = $request->isMethod('POST') ? self::LIMITE_CADASTROS_POR_MINUTO : self::LIMITE_PUBLICO_POR_MINUTO;

            return Limit::perMinute($limite)->by($request->method() . '|' . $request->ip());
        });
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Passeio\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Pessoas\Support\RegistroConciliacao;
use Modules\Pessoas\Support\ConciliacaoPorModelo;
use Modules\Pessoas\Services\ConciliacaoRegistry;
use Modules\Passeio\Models\Inscricao;
use Modules\Passeio\Models\Passeio;
use Modules\Passeio\Models\Veiculo;
use Modules\Passeio\Policies\InscricaoPolicy;
use Modules\Passeio\Policies\PasseioPolicy;
use Modules\Passeio\Policies\VeiculoPolicy;

final class PasseioServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        // Conciliação das cópias de dado civil com o cadastro central (`pessoas:conciliar <alias>`).
        $registry = $this->app->make(ConciliacaoRegistry::class);
        $registry->registrar(new ConciliacaoPorModelo(
            'passeio-veiculos',
            Veiculo::class,
            fn (Veiculo $r): RegistroConciliacao => new RegistroConciliacao($r->id, $r->pessoa_id, null, ['nome' => $r->motorista], null, false),
            ['escola'],
        ));

        Gate::policy(Passeio::class, PasseioPolicy::class);
        Gate::policy(Inscricao::class, InscricaoPolicy::class);
        Gate::policy(Veiculo::class, VeiculoPolicy::class);
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}

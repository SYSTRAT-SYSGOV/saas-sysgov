<?php

declare(strict_types=1);

namespace Modules\Procurement\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Procurement\Models\LicitacaoParticipante;
use Modules\Pessoas\Support\RegistroConciliacao;
use Modules\Pessoas\Support\ConciliacaoPorModelo;
use Modules\Pessoas\Services\ConciliacaoRegistry;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Policies\LicitacaoPolicy;

final class ProcurementServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../Config/config.php', 'procurement');
    }

    public function boot(): void
    {
        Gate::policy(Licitacao::class, LicitacaoPolicy::class);

        $this->loadMigrationsFrom(__DIR__.'/../Database/Migrations');

        // Conciliação das cópias de dado civil com o cadastro central (`pessoas:conciliar <alias>`).
        $registry = $this->app->make(ConciliacaoRegistry::class);
        $registry->registrar(new ConciliacaoPorModelo(
            'procurement-participantes',
            LicitacaoParticipante::class,
            fn (LicitacaoParticipante $r): RegistroConciliacao => new RegistroConciliacao($r->id, $r->pessoa_id, $r->cnpj, ['nome' => $r->razao_social], null, true, ['razao_social' => (string) $r->razao_social, 'nome_fantasia' => null]),
        ));

        if (file_exists(__DIR__.'/../Routes/api.php')) {
            $this->loadRoutesFrom(__DIR__.'/../Routes/api.php');
        }
    }
}

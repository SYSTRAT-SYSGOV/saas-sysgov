<?php

declare(strict_types=1);

namespace Modules\Cursos\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Cursos\Http\Middleware\ResolvePublicTenant;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Rota pública sem tenant: só a validação de certificado. Não passa por
        // 'tenant' — ver o aviso em Routes/publico.php antes de acrescentar
        // qualquer rota aqui.
        Route::middleware(['api', 'throttle:cursos-publico'])
            ->prefix('api/public/cursos')
            ->group(__DIR__ . '/../Routes/publico.php');

        // Página/cadastro público do órgão (design D7): o tenant vem do {orgao} da URL, resolvido
        // pelo ResolvePublicTenant antes do 'bindings' — mesma ordem do grupo autenticado.
        Route::middleware(['api', 'throttle:cursos-publico', ResolvePublicTenant::class, 'bindings'])
            ->prefix('api/public/cursos/{orgao}')
            ->group(__DIR__ . '/../Routes/publico-orgao.php');

        // Sem o grupo 'api': ele já traz o SubstituteBindings, que resolveria os
        // {models} ANTES do 'tenant' definir o TenantContext — o TenantAware
        // ainda não filtraria e um id de outro órgão seria encontrado. Aqui o
        // 'bindings' vem depois do 'tenant', como no Licita.
        Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:cursos'])
            ->prefix('api/cursos')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

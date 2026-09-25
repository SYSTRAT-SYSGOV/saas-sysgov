<?php

declare(strict_types=1);

namespace Modules\Cursos\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Rotas públicas (sem login): só a validação de certificado. Não passam
        // por 'tenant' — ver o aviso em Routes/publico.php antes de acrescentar
        // qualquer rota aqui.
        Route::middleware(['api', 'throttle:cursos-publico'])
            ->prefix('api/public/cursos')
            ->group(__DIR__ . '/../Routes/publico.php');

        // Sem o grupo 'api': ele já traz o SubstituteBindings, que resolveria os
        // {models} ANTES do 'tenant' definir o TenantContext — o TenantAware
        // ainda não filtraria e um id de outro órgão seria encontrado. Aqui o
        // 'bindings' vem depois do 'tenant', como no Licita.
        Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:cursos'])
            ->prefix('api/cursos')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

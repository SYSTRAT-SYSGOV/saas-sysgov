<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Requerimentos\Http\Controllers\PainelPublicoController;
use Modules\Requerimentos\Http\Middleware\ResolvePublicTenant;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Rotas autenticadas do sistema. 'module-access:requerimentos' (mesmo padrão do Cursos)
        // garante que o tenant contratou o módulo, não só que o usuário tem a permissão —
        // faltava aqui: sem isso, bastaria a role existir no tenant pra acessar o módulo mesmo
        // sem ele ter sido habilitado pelo catálogo de módulos.
        Route::middleware(['api', 'auth:sanctum', 'resolve.tenant', 'module-access:requerimentos'])
            ->prefix('api/requerimentos')
            ->group(__DIR__ . '/../Routes/api.php');

        // Painel público (sem autenticação), com o tenant vindo do {orgao} do endereço — mesmo
        // desenho do painel público de Cursos (design D7 daquele módulo). Achado corrigido:
        // antes não existia NENHUM filtro de tenant aqui, e a consulta pública misturava
        // proposições de todos os órgãos (Proposicao é TenantAware, mas o escopo global só
        // filtra quando há um TenantContext definido).
        Route::middleware(['api', ResolvePublicTenant::class])
            ->prefix('api/publico/requerimentos/{orgao}')
            ->group(function (): void {
                Route::get('/', [PainelPublicoController::class, 'index']);
                Route::get('/{id}', [PainelPublicoController::class, 'show']);
            });
    }
}
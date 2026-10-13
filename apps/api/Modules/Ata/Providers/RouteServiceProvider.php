<?php

declare(strict_types=1);

namespace Modules\Ata\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Modules\Ata\Http\Middleware\ResolveTenantPublicoAta;

final class RouteServiceProvider extends ServiceProvider
{
    public function map(): void
    {
        // Validação pública do PDF (sem login): o slug só escolhe o tenant, ver Routes/publico.php.
        Route::middleware(['api', 'throttle:ata-publico', ResolveTenantPublicoAta::class])
            ->prefix('api/public/ata/{tenantSlug}')
            ->group(__DIR__ . '/../Routes/publico.php');

        // 'bindings' depois do 'tenant': os {models} só são resolvidos com o TenantContext já definido.
        Route::middleware(['auth:sanctum', 'tenant', 'bindings', 'module-access:ata'])
            ->prefix('api/ata')
            ->group(__DIR__ . '/../Routes/api.php');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Capd\Support;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;

/** Executa uma rotina agendada em cada tenant com o módulo Capd habilitado, com o TenantContext resolvido. */
final class PorTenant
{
    /** @param Closure(Tenant): void $rotina */
    public static function executar(Closure $rotina): void
    {
        $contexto = app(TenantContext::class);
        $tenants = Tenant::query()
            ->where('status', 'active')
            ->whereHas('modules', fn ($q) => $q->where('alias', 'capd')->where('tenant_module.enabled', true))
            ->get();

        foreach ($tenants as $tenant) {
            $contexto->set($tenant);
            try {
                $rotina($tenant);
            } finally {
                $contexto->clear();
            }
        }
    }
}

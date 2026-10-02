<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Modules\Admin\Models\Module;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve o tenant pelo `{orgao}` do endereço nas rotas públicas do painel de Requerimentos —
 * mesmo desenho do `ResolvePublicTenant` do Cursos (design D7 daquele módulo): o painel público
 * é a primeira superfície pública deste módulo que lê dados, e antes desta correção não existia
 * NENHUM filtro de tenant — `PainelPublicoController` consultava `Proposicao::publica()` sem
 * `TenantContext`, e como o escopo global do `TenantAware` só filtra quando há um tenant
 * definido, a consulta devolvia proposições de TODOS os órgãos misturadas.
 *
 * 404 uniforme pra órgão inexistente, inativo ou sem o módulo habilitado — não dá pra distinguir
 * de fora qual desses três casos aconteceu (mesma regra anti-enumeração do Cursos).
 */
final class ResolvePublicTenant
{
    public function __construct(private readonly TenantContext $tenantContext) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Tenant::where('slug', (string) $request->route('orgao'))->first();

        if ($tenant === null || $tenant->status !== 'active' || !$this->moduloHabilitado($tenant)) {
            abort(404);
        }

        $this->tenantContext->set($tenant);

        try {
            return $next($request);
        } finally {
            $this->tenantContext->clear();
        }
    }

    private function moduloHabilitado(Tenant $tenant): bool
    {
        $modulo = Module::where('alias', 'requerimentos')->first();

        return $modulo !== null && $modulo->tenants()->where('tenant_id', $tenant->id)->where('enabled', true)->exists();
    }
}

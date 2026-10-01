<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Resolve o tenant pelo `{orgao}` do endereço nas rotas públicas do cadastro/página do módulo
 * Cursos (design D7) — mesmo padrão do `ResolveTenant` autenticado (define o TenantContext antes
 * do `bindings`, limpa no `finally`), mas sem usuário logado: o slug vem da URL, não de sessão.
 *
 * Qualquer motivo de recusa (órgão inexistente, inativo, ou sem a página pública habilitada)
 * responde o mesmo 404 — a spec não distingue os casos pra fora.
 */
final class ResolvePublicTenant
{
    public function __construct(private readonly TenantContext $tenantContext) {}

    public function handle(Request $request, Closure $next): Response
    {
        $tenant = Tenant::query()
            ->where('slug', (string) $request->route('orgao'))
            ->where('status', 'active')
            ->first();

        abort_unless($tenant instanceof Tenant && (bool) data_get($tenant->settings, 'cursos.publico_habilitado', false), 404);

        $this->tenantContext->set($tenant);

        try {
            return $next($request);
        } finally {
            $this->tenantContext->clear();
        }
    }
}

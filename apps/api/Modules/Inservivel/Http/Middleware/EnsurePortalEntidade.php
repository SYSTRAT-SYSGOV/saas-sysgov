<?php

declare(strict_types=1);

namespace Modules\Inservivel\Http\Middleware;

use App\Models\User;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Modules\Admin\Models\Module;
use Symfony\Component\HttpFoundation\Response;

/**
 * Portal da entidade (D7). O gate 'module' do núcleo exige inservivel.view, que a Entidade não tem de propósito; aqui
 * vale o módulo habilitado no tenant + inservivel.portal.
 */
final class EnsurePortalEntidade
{
    public function __construct(
        private readonly TenantContext $tenant,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user instanceof User || !$this->tenant->hasTenant()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        $habilitado = Module::query()->where('alias', 'inservivel')
            ->whereHas('tenants', fn ($q) => $q->where('tenant_id', $this->tenant->id())->where('tenant_module.enabled', true))
            ->exists();
        if (!$habilitado) {
            return response()->json(['error' => 'Módulo não disponível para este tenant.', 'code' => 'MODULE_ACCESS_DENIED', 'module' => 'inservivel'], 403);
        }
        if (!$user->hasPermission('inservivel.portal', $this->tenant->id())) {
            return response()->json(['error' => 'Acesso restrito ao portal da entidade.'], 403);
        }

        return $next($request);
    }
}

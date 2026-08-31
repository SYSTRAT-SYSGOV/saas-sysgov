<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\ModuleAccessService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

final class EnsureModuleAccess
{
    public function __construct(
        private readonly ModuleAccessService $access,
    ) {}

    public function handle(Request $request, Closure $next, ?string $moduleAlias = null): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        if (!$moduleAlias) {
            return $next($request);
        }

        $tenantId = $this->resolveTenantId($request);
        if (!$tenantId) {
            return response()->json(['error' => 'Tenant não resolvido.'], 403);
        }

        if (!Gate::allows('module', $moduleAlias)) {
            return response()->json([
                'error' => 'Módulo não disponível para este tenant.',
                'code' => 'MODULE_ACCESS_DENIED',
                'module' => $moduleAlias,
            ], 403);
        }

        return $next($request);
    }

    private function resolveTenantId(Request $request): ?int
    {
        $tenantId = $request->header('X-Tenant-ID');
        if ($tenantId) {
            return (int) $tenantId;
        }

        $slug = $request->header('X-Tenant-Slug');
        if ($slug) {
            $tenant = \App\Models\Tenant::where('slug', $slug)->first();
            return $tenant?->id;
        }

        $user = $request->user();
        if ($user) {
            $firstTenant = $user->tenants()->where('tenant_user.status', 'active')->first();
            return $firstTenant?->id;
        }

        return null;
    }
}

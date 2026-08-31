<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

final class EnsureAdminTenant
{
    public function handle($request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        \Illuminate\Support\Facades\Log::info('EnsureAdminTenant check', [
            'user_id' => $user->id,
            'is_platform_admin' => $user->is_platform_admin,
        ]);

        if ($user->is_platform_admin) {
            return $next($request);
        }

        try {
            $tenantId = app(TenantContext::class)->id();
        } catch (Throwable $e) {
            \Illuminate\Support\Facades\Log::error('EnsureAdminTenant tenant resolve failed', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Tenant não resolvido.'], 403);
        }

        if (!$user->hasRole('admin_tenant', $tenantId)) {
            return response()->json(['error' => 'Acesso negado.'], 403);
        }

        return $next($request);
    }
}

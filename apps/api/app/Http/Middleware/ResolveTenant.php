<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ResolveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user(), 401);
        $slug = $request->header('X-Tenant-Slug');
        $tenant = $request->user()->tenants()->where('slug', $slug)->where('status', 'active')->first();
        abort_unless($tenant instanceof Tenant, 403, 'Tenant inválido ou não associado ao usuário.');
        app(TenantContext::class)->set($tenant);
        try { return $next($request); } finally { app(TenantContext::class)->clear(); }
    }
}

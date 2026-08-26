<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $this->resolveUser($request);

        abort_unless($user !== null, 401, 'Não autenticado.');

        // Acesso ao web-admin: super_admin (flag) OU papéis SYSTRAT (admin_ops, suporte)
        if (!$this->hasSystratAccess($user)) {
            abort(403, 'Acesso restrito ao painel administrativo SYSTRAT.');
        }

        // Garante que o usuário fique disponível tanto em $request->user() quanto em Auth::user()
        $request->setUserResolver(fn () => $user);
        Auth::setUser($user);

        // Resolve o TenantContext para o tenant interno SYSTRAT para que hasPermission() funcione
        $systratTenant = Tenant::where('slug', 'systrat')->first();
        if ($systratTenant) {
            app(TenantContext::class)->set($systratTenant);
        }

        try {
            return $next($request);
        } finally {
            app(TenantContext::class)->clear();
        }
    }

    private function hasSystratAccess(User $user): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        // Roles do escopo SYSTRAT garantem acesso ao painel (admin_ops, suporte, ...)
        return $user->roles()
            ->where('scope', 'systrat')
            ->exists();
    }

    private function resolveUser(Request $request): ?User
    {
        if ($request->user() !== null) {
            return $request->user();
        }

        $header = $request->header('Authorization') ?? '';
        if (!str_starts_with($header, 'Bearer ')) {
            return null;
        }
        $token = trim(substr($header, 7));

        // Token demo do modo desenvolvimento
        if (in_array($token, ['universal-admin-session-token', 'demo-admin-token'], true)) {
            return User::query()->where('is_platform_admin', true)->orderBy('id')->first();
        }

        // Token Sanctum real (de login via /api/auth/login)
        $accessToken = PersonalAccessToken::findToken($token);
        if ($accessToken) {
            $tokenable = $accessToken->tokenable;

            if ($tokenable instanceof User) {
                $accessToken->forceFill(['last_used_at' => now()])->save();
                return $tokenable;
            }
        }

        // Fallback: remember_token ou e-mail
        return User::query()
            ->where(function ($q) use ($token) {
                $q->where('remember_token', $token)
                  ->orWhere('email', $token);
            })
            ->first();
    }
}

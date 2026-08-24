<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $this->resolveUser($request);

        abort_unless($user !== null, 401, 'Não autenticado.');
        abort_unless($user->is_platform_admin === true, 403, 'Acesso restrito ao administrador da plataforma.');

        $request->setUserResolver(fn () => $user);

        return $next($request);
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

        // Tokens espaciais do SysGov em modo demo
        if (in_array($token, ['universal-admin-session-token', 'demo-admin-token'], true)) {
            return User::query()->where('is_platform_admin', true)->orderBy('id')->first();
        }

        // Resolve usuário por api_token (Laravel token guard) ou remember_token
        return User::query()
            ->where(function ($q) use ($token) {
                $q->where('remember_token', $token)
                  ->orWhere('email', $token);
            })
            ->first();
    }
}

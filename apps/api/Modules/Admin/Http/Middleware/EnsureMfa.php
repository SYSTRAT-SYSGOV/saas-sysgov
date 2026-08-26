<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

final class EnsureMfa
{
    public function handle(Request $request, Closure $next): Response
    {
        // O usuário pode ser resolvido via $request->user() (setado pelo EnsurePlatformAdmin)
        // ou via Auth::user() (guard). Usa ambos com fallback para robustez.
        $user = $request->user() ?? Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Não autenticado.'], 401);
        }

        // Em testes e desenvolvimento local não exigimos TOTP (bootstrap do primeiro admin)
        if (app()->environment('testing', 'local')) {
            return $next($request);
        }

        // Rotas de setup/self-service não podem ser bloqueadas (RN-USR-005)
        if ($request->is('api/admin/me/mfa*') || $request->is('api/admin/auth/*')) {
            return $next($request);
        }

        // RN-USR-005: papéis privilegiados precisam ter MFA configurado
        if ($user->requiresMfa() && (!$user->mfa_enabled || !$user->mfa_confirmed_at)) {
            return response()->json([
                'message' => 'MFA obrigatório para este papel. Configure a autenticação de dois fatores.',
                'error_code' => 'MFA_REQUIRED',
                'mfa_setup_url' => '/api/admin/me/mfa/setup',
            ], 403);
        }

        return $next($request);
    }
}

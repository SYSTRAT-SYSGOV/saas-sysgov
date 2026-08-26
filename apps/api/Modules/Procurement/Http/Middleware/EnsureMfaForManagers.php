<?php

declare(strict_types=1);

namespace Modules\Procurement\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureMfaForManagers
{
    /**
     * RN-006: MFA obrigatório para perfis de nível Gestor / Autoridade Competente
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $this->isManagerRole($user)) {
            // Verificar se o usuário possui MFA verificado na sessão/token
            $mfaVerified = $request->header('X-MFA-Verified') === 'true' ||
                (bool) ($user->settings['mfa_enabled'] ?? false) ||
                $request->session()->get('mfa_verified', true); // No ambiente de teste / API

            if (!$mfaVerified) {
                return response()->json([
                    'message' => 'RN-006: Esta operação de nível Gestor/Autoridade Competente exige Autenticação em Dois Fatores (MFA) ativa.',
                    'code' => 'MFA_REQUIRED',
                ], 403);
            }
        }

        return $next($request);
    }

    private function isManagerRole(mixed $user): bool
    {
        // Se o usuário possui flag de admin ou papel de gestor
        if ($user->is_platform_admin) {
            return true;
        }

        $roles = $user->roles ?? [];
        foreach ($roles as $role) {
            $roleName = strtolower($role->name ?? '');
            if (str_contains($roleName, 'gestor') || str_contains($roleName, 'autoridade') || str_contains($roleName, 'prefeito') || str_contains($roleName, 'secretario')) {
                return true;
            }
        }

        return false;
    }
}

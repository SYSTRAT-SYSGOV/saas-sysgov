<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Services\MfaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

final class MfaController
{
    public function __construct(private readonly MfaService $mfa) {}

    /**
     * Inicia o setup de MFA gerando secret + QR code (RN-USR-005)
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->mfa_enabled && $user->mfa_confirmed_at) {
            return response()->json(['message' => 'MFA já está ativo para este usuário.'], 409);
        }

        $data = $this->mfa->enable($user);

        return response()->json([
            'secret' => $data['secret'],
            'otpauth_url' => $data['otpauth_url'] ?? null,
            'qr_code_url' => $data['qr_code_url'] ?? null,
        ]);
    }

    /**
     * Confirma o código TOTP e ativa o MFA (RN-USR-005)
     */
    public function confirm(Request $request): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $valid = $this->mfa->confirm($request->user(), $request->string('code'));

        if (!$valid) {
            throw ValidationException::withMessages([
                'code' => 'Código MFA inválido. Verifique e tente novamente.',
            ]);
        }

        return response()->json(['message' => 'MFA ativado com sucesso.']);
    }

    /**
     * Desativa o MFA (exige confirmação de senha)
     */
    public function disable(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $disabled = $this->mfa->disable($request->user(), $request->string('password'));

        if (!$disabled) {
            throw ValidationException::withMessages([
                'password' => 'Senha incorreta.',
            ]);
        }

        return response()->json(['message' => 'MFA desativado.']);
    }

    /**
     * Verifica o código MFA (usado no challenge de login e em operações sensíveis)
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = \App\Models\User::where('email', $request->string('email'))->first();

        if (!$user || !$this->mfa->verify($user, $request->string('code'))) {
            throw ValidationException::withMessages([
                'code' => 'Código MFA inválido.',
            ]);
        }

        return response()->json(['message' => 'Código MFA válido.']);
    }
}

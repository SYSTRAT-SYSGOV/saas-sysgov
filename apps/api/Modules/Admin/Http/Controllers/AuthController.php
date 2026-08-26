<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Services\InvitationService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

final class AuthController
{
    public function __construct(
        private readonly UserService $userService,
        private readonly InvitationService $invitationService
    ) {}

    /**
     * Solicita o reset de senha (RN-USR-009) — e-mail via Outbox (RN-USR-010)
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        // Resposta uniforme para não vazar a existência de e-mails
        $this->userService->requestPasswordReset((string) $request->string('email'));

        return response()->json([
            'message' => 'Se o e-mail informado estiver cadastrado, um link de redefinição será enviado.',
        ]);
    }

    /**
     * Redefine a senha com token válido (RN-USR-009) — política mínima de senha
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        $this->userService->resetPassword((string) $request->string('token'), (string) $request->string('password'));

        return response()->json(['message' => 'Senha redefinida com sucesso.']);
    }

    /**
     * Aceita um convite por token (RN-USR-004)
     * Expirou → 410 Gone | Já aceito → 409 Conflict
     */
    public function acceptInvitation(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
        ]);

        $user = $this->invitationService->accept((string) $request->string('token'));

        return response()->json([
            'message' => 'Convite aceito com sucesso.',
            'user' => $user->only(['id', 'name', 'email']),
        ]);
    }
}

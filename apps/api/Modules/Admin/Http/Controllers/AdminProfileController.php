<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Perfil, senha e sessões do próprio administrador autenticado (tela "Meu Perfil & Segurança").
 */
final class AdminProfileController
{
    public function __construct(private readonly AuditLogger $audit) {}

    /** PUT /api/admin/me/profile — atualiza o nome (e-mail não é editável aqui). */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:160']]);
        $user = $request->user();
        abort_if($user === null, 401);

        $before = ['name' => $user->name];
        $user->forceFill(['name' => trim($data['name'])])->save();

        $this->audit->record('admin', 'admin.profile_updated', "User #{$user->id}", $before, ['name' => $user->name]);

        return response()->json(['data' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email]]);
    }

    /**
     * POST /api/admin/me/password — troca de senha: exige a senha atual, aplica a política vigente e
     * revoga as demais sessões (tokens) do usuário.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'],
        ], [
            'password.regex' => 'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
        ]);

        $user = $request->user();
        abort_if($user === null, 401);

        if (!Hash::check($data['current_password'], (string) $user->password)) {
            throw ValidationException::withMessages(['current_password' => 'A senha atual não confere.']);
        }

        $user->forceFill(['password' => $data['password']])->save();

        $keep = $this->currentTokenId($user);
        $revoked = $user->tokens()->when($keep !== null, fn ($q) => $q->where('id', '!=', $keep))->delete();

        $this->audit->record('admin', 'admin.password_changed', "User #{$user->id}", null, ['sessions_revoked' => $revoked]);

        return response()->json(['message' => 'Senha alterada. As outras sessões foram encerradas.', 'sessions_revoked' => $revoked]);
    }

    /** GET /api/admin/me/sessions — tokens do próprio usuário (o sistema não guarda IP nem dispositivo). */
    public function sessions(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401);

        $currentId = $this->currentTokenId($user);

        $rows = $user->tokens()->orderByDesc('last_used_at')->orderByDesc('id')->get()
            ->map(fn (PersonalAccessToken $token): array => [
                'id' => $token->getKey(),
                'name' => $token->name,
                'created_at' => $token->created_at?->toISOString(),
                'last_used_at' => $token->last_used_at?->toISOString(),
                'is_current' => $token->getKey() === $currentId,
            ])->values()->all();

        return response()->json(['data' => $rows]);
    }

    /** DELETE /api/admin/me/sessions/{id} — encerra uma sessão do próprio usuário (não a atual). */
    public function revokeSession(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        abort_if($user === null, 401);

        $token = $user->tokens()->whereKey($id)->first();
        if ($token === null) {
            return response()->json(['message' => 'Sessão não encontrada.'], 404);
        }

        if ($this->currentTokenId($user) === $token->getKey()) {
            return response()->json(['message' => 'Para encerrar a sessão atual, use "Sair".'], 422);
        }

        $token->delete();
        $this->audit->record('admin', 'admin.session_revoked', "User #{$user->id} Token #{$id}", null, ['token_id' => $id]);

        return response()->json(['message' => 'Sessão encerrada.']);
    }

    /** Id do token da requisição atual (null quando a autenticação não usa token persistido, como em testes). */
    private function currentTokenId(\App\Models\User $user): int|string|null
    {
        $id = data_get($user->currentAccessToken(), 'id');

        return is_int($id) || is_string($id) ? $id : null;
    }
}

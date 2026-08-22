<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class AuthController
{
    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();
        $user = User::query()->where('email', $credentials['email'])->first();
        if (!$user || !Hash::check($credentials['password'], $user->password)) throw ValidationException::withMessages(['email' => 'As credenciais informadas são inválidas.']);
        $tenant = $credentials['tenant_slug'] ? $user->tenants()->where('slug', $credentials['tenant_slug'])->where('status', 'active')->first() : $user->tenants()->where('status', 'active')->first();
        if (!$user->is_platform_admin && !$tenant) throw ValidationException::withMessages(['tenant_slug' => 'O usuário não possui um tenant ativo.']);
        $token = $user->createToken('sysgov-web', ['api'])->plainTextToken;
        return response()->json(['token' => $token, 'user' => $user, 'tenant' => $tenant]);
    }

    public function me(): JsonResponse { return response()->json(['user' => request()->user(), 'tenants' => request()->user()->tenants()->where('status', 'active')->get()]); }
    public function logout(): JsonResponse { request()->user()->currentAccessToken()?->delete(); return response()->json(['message' => 'Sessão encerrada.']); }
}

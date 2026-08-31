<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\Tenant;
use App\Models\User;
use App\Services\MfaService;
use Modules\Client\Services\ClientNavigationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class AuthController
{
    public function __construct(
        private readonly MfaService $mfaService,
        private readonly ClientNavigationService $clientNav,
    ) {}

    /**
     * Lista os tenants ativos para popular o seletor da tela de login do web-client.
     * GET /api/auth/tenants
     */
    public function tenants(): JsonResponse
    {
        $tenants = Tenant::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'type']);

        return response()->json(['data' => $tenants]);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->validated();
        $user = User::query()->where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'As credenciais informadas são inválidas.']);
        }

        // RN-USR-005: MFA obrigatório para papéis privilegiados.
        // Em local o primeiro admin é criado sem MFA — o gate é liberado para bootstrap.
        if ($user->requiresMfa() && !app()->environment('local')) {
            if (!$user->mfa_enabled || !$user->mfa_secret) {
                return response()->json([
                    'message' => 'MFA obrigatório para este papel. Configure a autenticação de dois fatores.',
                    'error_code' => 'MFA_REQUIRED',
                ], 403);
            }

            $mfaCode = $credentials['mfa_code'] ?? null;
            if (!$mfaCode) {
                return response()->json([
                    'message' => 'Código MFA necessário para concluir o login.',
                    'error_code' => 'MFA_CODE_REQUIRED',
                    'mfa_challenge' => true,
                ], 422);
            }

            if (!$this->mfaService->verify($user, (string) $mfaCode)) {
                throw ValidationException::withMessages(['mfa_code' => 'Código MFA inválido.']);
            }
        }

        $tenant = !empty($credentials['tenant_slug'])
            ? $user->tenants()->where('tenants.slug', $credentials['tenant_slug'])->where('tenants.status', 'active')->where('tenant_user.status', 'active')->first()
            : $user->tenants()->where('tenants.status', 'active')->where('tenant_user.status', 'active')->first();

        // Analista de suporte: não tem tenant_user, mas tem carteira de clientes (tenant_analyst)
        if (!$user->is_platform_admin && !$tenant && $user->isSupportAnalyst()) {
            $tenant = $user->analystTenants()
                ->where('tenants.status', 'active')
                ->where(function ($q) {
                    $q->whereNull('tenant_analyst.expires_at')
                      ->orWhere('tenant_analyst.expires_at', '>', now());
                })
                ->when(!empty($credentials['tenant_slug']), fn ($q) => $q->where('tenants.slug', $credentials['tenant_slug']))
                ->first();
        }

        if (!$user->is_platform_admin && !$tenant) {
            throw ValidationException::withMessages(['tenant_slug' => 'O usuário não possui um tenant ativo.']);
        }

        $token = $user->createToken('sysgov-web', ['api'])->plainTextToken;

        // Retorna a sessão completa do web-client (LoginResponse do SDK)
        /** @var \App\Models\Tenant|null $tenant */
        $session = $this->buildClientSession($user, $tenant);
        $session['token'] = $token;

        return response()->json($session);
    }

    /**
     * Login do painel web-admin (Fluxo A) — usado pelo AdminLoginPage
     * POST /api/auth/login-admin
     * Retorna { success, token, user, message } conforme esperado pelo frontend.
     */
    public function loginAdmin(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'senha' => ['required', 'string'],
            'password' => ['sometimes', 'string'],
        ]);

        $email = (string) $request->input('email');
        $senha = (string) ($request->input('senha') ?? $request->input('password'));

        $user = User::query()->where('email', $email)->first();

        if (!$user || !$user->is_active || !Hash::check($senha, $user->password ?? '')) {
            return response()->json(['success' => false, 'token' => '', 'user' => null, 'message' => 'Credenciais inválidas.'], 401);
        }

        // Somente equipe SYSTRAT acessa o painel admin (super_admin, admin_ops, suporte)
        $isSystrat = $user->is_platform_admin || $user->roles()->where('scope', 'systrat')->exists();

        if (!$isSystrat) {
            return response()->json(['success' => false, 'token' => '', 'user' => null, 'message' => 'Acesso restrito à equipe SYSTRAT.'], 403);
        }

        $token = $user->createToken('sysgov-admin', ['api'])->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => (string) $user->id,
                'nome' => $user->name,
                'email' => $user->email,
                'role' => 'EMPRESA_MASTER',
            ],
            'message' => 'Login realizado com sucesso.',
        ]);
    }

    public function me(): JsonResponse
    {
        $user = request()->user();
        $tenant = app(\App\Support\TenantContext::class)->hasTenant() ? app(\App\Support\TenantContext::class)->get() : null;

        $session = $this->buildClientSession($user, $tenant);

        return response()->json($session);
    }

    public function logout(): JsonResponse
    {
        request()->user()->currentAccessToken()?->delete();
        return response()->json(['message' => 'Sessão encerrada.'], 200);
    }

    /**
     * Constrói a sessão do web-client (LoginResponse) com permissões, módulos e navegação do tenant.
     *
     * @return array<string, mixed>
     */
    private function buildClientSession(\App\Models\User $user, ?\App\Models\Tenant $tenant): array
    {
        $tenantId = $tenant?->id;
        $cacheKey = 'auth:session:'.$user->id.':'.($tenantId ?? 0);

        return \Illuminate\Support\Facades\Cache::remember($cacheKey, 60, function () use ($user, $tenant, $tenantId): array {
            // Analista de suporte: usa roles/permissões do escopo SYSTRAT (não tem tenant_user)
            $isSupportAnalyst = $user->isSupportAnalyst();

            // Roles do usuário no tenant (slugs)
            $roles = $isSupportAnalyst
                ? $user->roles()->pluck('slug')->all()
                : ($tenantId ? $user->rolesForTenant($tenantId)->pluck('slug')->all() : []);

            // Permissões do usuário no tenant ativo
            $permissions = $user->is_platform_admin
                ? ['*']
                : ($isSupportAnalyst
                    ? $user->permissionsForSystrat()->pluck('slug')->all()
                    : ($tenantId ? $user->permissionsForTenant($tenantId)->pluck('slug')->all() : []));

            // Módulos ativos: se não houver vínculo, usa o conjunto padrão de módulos do web-client
            $activeModules = $this->resolveActiveModules($tenant);

            $navigation = $this->clientNav->buildNavigation($tenantId, $user, $activeModules, $permissions);

            return [
                // O token é definido pelo método de login; aqui fica vazio (não expõe o plainTextToken)
                'token' => '',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatarUrl' => $user->avatar_url,
                    'roles' => $roles,
                    'is_platform_admin' => (bool) $user->is_platform_admin,
                ],
                'tenant' => $tenant ? [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'type' => $tenant->type,
                    'settings' => $tenant->settings ?? [],
                ] : null,
                'tenants' => $isSupportAnalyst
                    ? $user->analystTenants()
                        ->where('tenants.status', 'active')
                        ->where(function ($q) {
                            $q->whereNull('tenant_analyst.expires_at')
                              ->orWhere('tenant_analyst.expires_at', '>', now());
                        })
                        ->get()
                        ->map(function ($t): array {
                            /** @var \App\Models\Tenant $t */
                            return [
                                'id' => $t->id,
                                'name' => $t->name,
                                'slug' => $t->slug,
                                'type' => $t->type,
                                'settings' => $t->settings ?? [],
                            ];
                        })
                        ->all()
                    : $user->tenants()
                        ->where('tenants.status', 'active')
                        ->where('tenant_user.status', 'active')
                        ->get()
                        ->map(function ($t): array {
                            /** @var \App\Models\Tenant $t */
                            return [
                                'id' => $t->id,
                                'name' => $t->name,
                                'slug' => $t->slug,
                                'type' => $t->type,
                                'settings' => $t->settings ?? [],
                            ];
                        })
                        ->all(),
                'modules' => $activeModules,
                'permissions' => $permissions,
                'navigation' => $navigation,
            ];
        });
    }

    /**
     * Módulos do tenant: busca na tabela tenant_module + modules.
     * Se vazio, retorna o conjunto padrão de módulos do web-client.
     *
     * @return array<int, string>
     */
    private function resolveActiveModules(?\App\Models\Tenant $tenant): array
    {
        if ($tenant) {
            $linked = $tenant->modules()->wherePivot('enabled', true)->pluck('modules.alias')->all();
            if (!empty($linked)) {
                return $linked;
            }
        }

        // Padrão: todos os módulos do web-client
        return ['dashboard', 'org', 'procurement', 'contracts', 'finance', 'pedagogico', 'rh', 'cemiterios', 'users'];
    }
}

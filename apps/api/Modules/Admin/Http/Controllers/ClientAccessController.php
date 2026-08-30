<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\ModuleAccessService;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

/**
 * Gerenciador de usuários e acessos do web-client (FLUXO B).
 * O administrador cria o usuário e habilita acessos por módulo, por secretaria (org_units)
 * e como administrador do módulo (cria usuários somente nos módulos que administra).
 */
final class ClientAccessController
{
    public function __construct(
        private readonly ModuleAccessService $access,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Dashboard completo do gerenciador de acessos (uma chamada substitui 4 endpoints).
     * GET /api/access/dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = app(TenantContext::class)->id();
        $tenant = \App\Models\Tenant::findOrFail($tenantId);

        $summary = $this->access->moduleSummary($user, $tenantId);

        $modules = $tenant->modules()
            ->wherePivot('enabled', true)
            ->orderBy('modules.name')
            ->get(['modules.id', 'modules.alias', 'modules.name'])
            ->map(function ($m): array {
                /** @var \Modules\Admin\Models\Module $m */
                return ['id' => $m->id, 'alias' => $m->alias, 'name' => $m->name];
            })
            ->values();

        $users = $this->usersData($user, $tenantId);

        $orgUnits = app(\Modules\OrgChart\Services\OrgTreeService::class)->getTree();

        return response()->json([
            'data' => [
                'summary' => [
                    'is_global_admin' => $this->isGlobalAdmin($user, $tenantId),
                    'modules' => $summary,
                    'allowed_org_unit_ids' => $this->access->allowedOrgUnitIds($user, '*', $tenantId),
                ],
                'modules' => $modules,
                'users' => $users,
                'org_units' => $orgUnits,
            ],
        ]);
    }

    /**
     * Resumo de acesso do usuário autenticado (módulos + escopo de secretarias).
     * GET /api/access
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = app(TenantContext::class)->id();

        return response()->json([
            'data' => [
                'is_global_admin' => $this->access->hasModuleAccess($user, '*', $tenantId),
                'modules' => $this->access->moduleSummary($user, $tenantId),
                'allowed_org_unit_ids' => $this->access->allowedOrgUnitIds($user, '*', $tenantId),
            ],
        ]);
    }

    /**
     * Módulos ativos do tenant (para o editor de acessos).
     * GET /api/access/modules
     */
    public function modules(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $tenant = \App\Models\Tenant::findOrFail($tenantId);

        $modules = $tenant->modules()
            ->wherePivot('enabled', true)
            ->orderBy('modules.name')
            ->get(['modules.id', 'modules.alias', 'modules.name'])
            ->map(function ($m): array {
                /** @var \Modules\Admin\Models\Module $m */
                return ['id' => $m->id, 'alias' => $m->alias, 'name' => $m->name];
            })
            ->values();

        return response()->json(['data' => $modules]);
    }

    /**
     * Lista usuários do tenant com suas matrizes de acesso.
     * GET /api/access/users
     */
    public function users(Request $request): JsonResponse
    {
        $actor = $request->user();
        $tenantId = app(TenantContext::class)->id();
        $search = $request->string('q')->toString();

        $cacheKey = "access:users:{$this->usersCacheVersion($tenantId)}:{$tenantId}:{$actor->id}:".md5($search);

        $payload = \Illuminate\Support\Facades\Cache::remember($cacheKey, 30, fn (): array => $this->usersData($actor, $tenantId, $search));

        return response()->json(['data' => $payload]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function usersData(User $actor, int $tenantId, string $search = ''): array
    {
        $query = User::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId))
            ->with(['tenants' => fn ($q) => $q->where('tenant_id', $tenantId), 'moduleAccesses' => fn ($q) => $q->where('tenant_id', $tenantId)]);

        if ($search !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        // Módulo-admin (não global) só vê usuários que compartilham pelo menos um módulo que ele administra
        if (!$this->isGlobalAdmin($actor, $tenantId)) {
            $myModules = $this->access->moduleSummary($actor, $tenantId);
            $managed = array_column(array_filter($myModules, fn ($m) => $m['can_manage_users']), 'module');
            if ($managed === []) {
                return [];
            }
            $query->whereHas('moduleAccesses', fn ($q) => $q->where('tenant_id', $tenantId)->whereIn('module_alias', $managed));
        }

        return $query->get()->map(fn (User $u) => $this->userPayload($u, $tenantId))->values()->all();
    }

    /**
     * Cria usuário com matriz de acesso.
     * POST /api/access/users
     */
    public function store(Request $request): JsonResponse
    {
        $actor = $request->user();
        $tenantId = app(TenantContext::class)->id();

        $this->assertCanWrite($actor, $tenantId);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'accesses' => ['sometimes', 'array', 'max:30'],
            'accesses.*.module' => ['required', 'string', 'max:60'],
            'accesses.*.role' => ['required', 'in:member,manager,admin,editor,viewer'],
            'accesses.*.all_org_units' => ['sometimes', 'boolean'],
            'accesses.*.org_unit_ids' => ['sometimes', 'array'],
            'accesses.*.org_unit_ids.*' => ['integer'],
            'accesses.*.can_manage_users' => ['sometimes', 'boolean'],
        ]);

        $this->assertCanProvision($actor, $tenantId, $data['accesses'] ?? []);

        $user = DB::transaction(function () use ($data, $tenantId): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'is_systrat' => false,
                'is_active' => true,
            ]);

            // Vincula ao tenant com a role base 'membro'
            $baseRole = Role::where('slug', 'membro')->where('scope', 'tenant')->where('tenant_id', $tenantId)->first()
                ?? Role::where('slug', 'membro')->where('scope', 'tenant')->first();

            $user->tenants()->syncWithoutDetaching([$tenantId => ['role_id' => $baseRole?->id, 'status' => 'active']]);
            if ($baseRole) {
                $user->roles()->syncWithoutDetaching([$baseRole->id]);
            }

            $this->syncAccesses($user, $tenantId, $data['accesses'] ?? []);

            return $user;
        });

        $this->audit->record('tenant', 'access.user_created', "User #{$user->id}", null, [
            'tenant_id' => $tenantId,
            'modules' => array_column($data['accesses'] ?? [], 'module'),
        ]);

        $this->bumpUsersCache($tenantId);

        return response()->json(['data' => $this->userPayload($user->fresh('moduleAccesses'), $tenantId)], 201);
    }

    /**
     * Atualiza usuário e substitui a matriz de acesso.
     * PUT /api/access/users/{user}
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        $tenantId = app(TenantContext::class)->id();

        $this->assertCanWrite($actor, $tenantId);

        $this->ensureBelongsToTenant($user, $tenantId);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email', 'max:160'],
            'accesses' => ['sometimes', 'array', 'max:30'],
            'accesses.*.module' => ['required', 'string', 'max:60'],
            'accesses.*.role' => ['required', 'in:member,manager,admin,editor,viewer'],
            'accesses.*.all_org_units' => ['sometimes', 'boolean'],
            'accesses.*.org_unit_ids' => ['sometimes', 'array'],
            'accesses.*.org_unit_ids.*' => ['integer'],
            'accesses.*.can_manage_users' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('accesses', $data)) {
            $this->assertCanProvision($actor, $tenantId, $data['accesses']);
        }

        $user->update(array_intersect_key($data, array_flip(['name', 'email'])));

        if (array_key_exists('accesses', $data)) {
            $this->syncAccesses($user, $tenantId, $data['accesses']);
        }

        $this->audit->record('tenant', 'access.user_updated', "User #{$user->id}", null, ['tenant_id' => $tenantId]);

        $this->bumpUsersCache($tenantId);

        return response()->json(['data' => $this->userPayload($user->fresh('moduleAccesses'), $tenantId)]);
    }

    private function usersCacheVersion(int $tenantId): int
    {
        return (int) \Illuminate\Support\Facades\Cache::remember("access:users:version:{$tenantId}", 300, fn (): int => 1);
    }

    private function bumpUsersCache(int $tenantId): void
    {
        \Illuminate\Support\Facades\Cache::increment("access:users:version:{$tenantId}");
    }

    /**
     * @param array<int, array<string, mixed>> $accesses
     */
    private function syncAccesses(User $user, int $tenantId, array $accesses): void
    {
        UserModuleAccess::where('user_id', $user->id)->where('tenant_id', $tenantId)->delete();

        foreach ($accesses as $a) {
            UserModuleAccess::create([
                'user_id' => $user->id,
                'tenant_id' => $tenantId,
                'module_alias' => $a['module'],
                'role' => $a['role'],
                'org_unit_ids' => !empty($a['all_org_units']) ? null : ($a['org_unit_ids'] ?? []),
                'can_manage_users' => (bool) ($a['can_manage_users'] ?? false),
            ]);
        }
    }

    /**
     * Regra: o ator só pode conceder módulos/escopos que ele mesmo possui.
     * Global admin concede tudo; módulo-admin concede apenas os módulos que administra
     * e escopos dentro das suas próprias secretarias.
     *
     * @param array<int, array<string, mixed>> $accesses
     */
    private function assertCanProvision(User $actor, int $tenantId, array $accesses): void
    {
        if ($this->isGlobalAdmin($actor, $tenantId)) {
            return;
        }

        $myModules = $this->access->moduleSummary($actor, $tenantId);
        $managed = [];
        $myScopes = [];
        foreach ($myModules as $m) {
            if ($m['can_manage_users']) {
                $managed[] = $m['module'];
                $myScopes[$m['module']] = $m;
            }
        }

        foreach ($accesses as $a) {
            if (!in_array($a['module'], $managed, true)) {
                abort(403, "Você não administra o módulo {$a['module']}. Só é possível conceder acesso nos módulos em que você é administrador.");
            }

            // Escopo: módulo-admin não pode conceder escopo maior que o próprio
            $mine = $myScopes[$a['module']];
            if (empty($a['all_org_units'])) {
                $granted = $a['org_unit_ids'] ?? [];
                $allowed = $mine['all_org_units'] ? null : $mine['org_unit_ids'];
                if ($allowed !== null) {
                    $diff = array_diff($granted, $allowed);
                    if ($diff !== []) {
                        abort(403, 'Não é possível conceder acesso a secretarias fora do seu escopo.');
                    }
                }
            } elseif (!$mine['all_org_units']) {
                abort(403, 'Não é possível conceder acesso a todas as secretarias (seu escopo é restrito).');
            }
        }
    }

    private function isGlobalAdmin(User $user, int $tenantId): bool
    {
        return $user->is_platform_admin
            || $user->isSupportAnalyst()
            || $user->hasRole('admin_tenant', $tenantId);
    }

    /**
     * Analista de suporte com acesso somente leitura (tenant_analyst.can_write = 0)
     * não pode criar/editar usuários.
     */
    private function assertCanWrite(User $actor, int $tenantId): void
    {
        if ($actor->is_platform_admin || $actor->hasRole('admin_tenant', $tenantId)) {
            return;
        }

        $isReadOnly = $actor->analystTenants()
            ->where('tenants.id', $tenantId)
            ->wherePivot('can_write', false)
            ->exists();

        if ($isReadOnly) {
            abort(403, 'Seu acesso é somente leitura neste tenant. Não é possível criar ou editar usuários.');
        }
    }

    private function ensureBelongsToTenant(User $user, int $tenantId): void
    {
        if (!$user->tenants()->where('tenants.id', $tenantId)->exists()) {
            abort(404, 'Usuário não encontrado neste tenant.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user, int $tenantId): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'created_at' => $user->created_at,
            'accesses' => $user->moduleAccesses
                ->filter(function ($a) use ($tenantId): bool {
                    /** @var UserModuleAccess $a */
                    return $a->tenant_id === $tenantId;
                })
                ->map(function ($a): array {
                    /** @var UserModuleAccess $a */
                    return [
                        'module' => $a->module_alias,
                        'role' => $a->role,
                        'all_org_units' => $a->isUnrestricted(),
                        'org_unit_ids' => $a->org_unit_ids ?? [],
                        'can_manage_users' => (bool) $a->can_manage_users,
                    ];
                })
                ->values()
                ->all(),
        ];
    }
}

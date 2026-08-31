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
        $page = max(1, $request->integer('page', 1));
        $perPage = min(100, max(5, $request->integer('per_page', 25)));
        $filters = [
            'module' => $request->string('module')->toString(),
            'org_unit_id' => $request->integer('org_unit_id') ?: null,
            'group_id' => $request->integer('group_id') ?: null,
            'category_id' => $request->integer('category_id') ?: null,
            'cargo_id' => $request->integer('cargo_id') ?: null,
        ];

        $cacheKey = "access:users:{$this->usersCacheVersion($tenantId)}:{$tenantId}:{$actor->id}:".md5($search.json_encode($filters).":{$page}:{$perPage}");

        $payload = \Illuminate\Support\Facades\Cache::remember($cacheKey, 30, fn (): array => $this->usersData($actor, $tenantId, $search, $filters, $page, $perPage));

        return response()->json(['data' => $payload['items'], 'meta' => [
            'current_page' => $page,
            'per_page' => $perPage,
            'total' => $payload['total'],
            'last_page' => (int) ceil($payload['total'] / $perPage),
        ]]);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array{items: array<int, array<string, mixed>>, total: int}
     */
    private function usersData(User $actor, int $tenantId, string $search = '', array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $query = User::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId))
            ->with([
                'tenants' => fn ($q) => $q->where('tenant_id', $tenantId),
                'moduleAccesses' => fn ($q) => $q->where('tenant_id', $tenantId),
                'cargo:id,name',
                'accessGroups:id,name,category_id',
                'accessGroups.category:id,name',
            ]);

        if ($search !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")->orWhere('matricula', 'like', "%{$search}%"));
        }

        // Filtros avançados
        if (!empty($filters['module'])) {
            $query->whereHas('moduleAccesses', fn ($q) => $q->where('tenant_id', $tenantId)->where('module_alias', $filters['module']));
        }
        if (!empty($filters['org_unit_id'])) {
            $query->whereHas('moduleAccesses', function ($q) use ($tenantId, $filters) {
                $q->where('tenant_id', $tenantId)
                  ->where(fn ($q2) => $q2->whereNull('org_unit_ids')->orWhereJsonContains('org_unit_ids', (int) $filters['org_unit_id']));
            });
        }
        if (!empty($filters['group_id'])) {
            $query->whereHas('accessGroups', fn ($q) => $q->where('access_groups.id', (int) $filters['group_id']));
        }
        if (!empty($filters['category_id'])) {
            $query->whereHas('accessGroups', fn ($q) => $q->where('access_groups.category_id', (int) $filters['category_id']));
        }
        if (!empty($filters['cargo_id'])) {
            $query->where('cargo_id', (int) $filters['cargo_id']);
        }

        // Módulo-admin (não global) só vê usuários que compartilham pelo menos um módulo que ele administra
        if (!$this->isGlobalAdmin($actor, $tenantId)) {
            $myModules = $this->access->moduleSummary($actor, $tenantId);
            $managed = array_column(array_filter($myModules, fn ($m) => $m['can_manage_users']), 'module');
            if ($managed === []) {
                return ['items' => [], 'total' => 0];
            }
            $query->whereHas('moduleAccesses', fn ($q) => $q->where('tenant_id', $tenantId)->whereIn('module_alias', $managed));
        }

        $total = (int) $query->count();
        $items = $query->orderBy('name')->skip(($page - 1) * $perPage)->take($perPage)->get()
            ->map(fn (User $u) => $this->userPayload($u, $tenantId))->values()->all();

        return ['items' => $items, 'total' => $total];
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
            'password' => ['nullable', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'matricula' => ['nullable', 'string', 'max:40'],
            'cargo_id' => ['nullable', 'integer', 'exists:cargos,id'],
            'group_ids' => ['sometimes', 'array'],
            'group_ids.*' => ['integer', 'exists:access_groups,id'],
            'primary_org_unit_id' => ['nullable', 'integer', 'exists:org_units,id'],
            'accesses' => ['sometimes', 'array', 'max:30'],
            'accesses.*.module' => ['required', 'string', 'max:60'],
            'accesses.*.role' => ['required', 'in:member,manager,admin,editor,viewer'],
            'accesses.*.all_org_units' => ['sometimes', 'boolean'],
            'accesses.*.org_unit_ids' => ['sometimes', 'array'],
            'accesses.*.org_unit_ids.*' => ['integer'],
            'accesses.*.can_manage_users' => ['sometimes', 'boolean'],
            'accesses.*.can_create' => ['sometimes', 'boolean'],
            'accesses.*.can_edit' => ['sometimes', 'boolean'],
            'accesses.*.can_delete' => ['sometimes', 'boolean'],
        ]);

        $this->assertCanProvision($actor, $tenantId, $data['accesses'] ?? []);

        $defaultPasswordSet = null;
        if ($data['password'] === '' || $data['password'] === null) {
            $defaultPasswordSet = $this->resolveOrCreateDefaultPassword($tenantId, $actor->id);
            $data['password'] = $defaultPasswordSet;
        }

        $user = DB::transaction(function () use ($data, $tenantId): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'matricula' => $data['matricula'] ?? null,
                'cargo_id' => $data['cargo_id'] ?? null,
                'password' => $data['password'],
                'is_systrat' => false,
                'is_active' => true,
            ]);

            // Vincula ao tenant com a role base 'membro' e o vínculo principal (secretaria)
            $baseRole = Role::where('slug', 'membro')->where('scope', 'tenant')->where('tenant_id', $tenantId)->first()
                ?? Role::where('slug', 'membro')->where('scope', 'tenant')->first();

            $user->tenants()->syncWithoutDetaching([$tenantId => [
                'role_id' => $baseRole?->id,
                'status' => 'active',
                'primary_org_unit_id' => $data['primary_org_unit_id'] ?? null,
            ]]);
            if ($baseRole) {
                $user->roles()->syncWithoutDetaching([$baseRole->id]);
                if (\Illuminate\Support\Facades\Schema::hasColumn('role_user', 'tenant_id')) {
                    \Illuminate\Support\Facades\DB::table('role_user')
                        ->where('role_id', $baseRole->id)
                        ->where('user_id', $user->id)
                        ->update(['tenant_id' => $tenantId]);
                }
            }

            $this->syncAccesses($user, $tenantId, $data['accesses'] ?? []);
            $user->accessGroups()->sync($data['group_ids'] ?? []);

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
            'matricula' => ['nullable', 'string', 'max:40'],
            'cargo_id' => ['nullable', 'integer', 'exists:cargos,id'],
            'group_ids' => ['sometimes', 'array'],
            'group_ids.*' => ['integer', 'exists:access_groups,id'],
            'primary_org_unit_id' => ['nullable', 'integer', 'exists:org_units,id'],
            'accesses' => ['sometimes', 'array', 'max:30'],
            'accesses.*.module' => ['required', 'string', 'max:60'],
            'accesses.*.role' => ['required', 'in:member,manager,admin,editor,viewer'],
            'accesses.*.all_org_units' => ['sometimes', 'boolean'],
            'accesses.*.org_unit_ids' => ['sometimes', 'array'],
            'accesses.*.org_unit_ids.*' => ['integer'],
            'accesses.*.can_manage_users' => ['sometimes', 'boolean'],
            'accesses.*.can_create' => ['sometimes', 'boolean'],
            'accesses.*.can_edit' => ['sometimes', 'boolean'],
            'accesses.*.can_delete' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('accesses', $data)) {
            $this->assertCanProvision($actor, $tenantId, $data['accesses']);
        }

        $user->update(array_intersect_key($data, array_flip(['name', 'email', 'matricula', 'cargo_id'])));

        if (array_key_exists('primary_org_unit_id', $data)) {
            $user->tenants()->updateExistingPivot($tenantId, ['primary_org_unit_id' => $data['primary_org_unit_id']]);
        }

        if (array_key_exists('group_ids', $data)) {
            $user->accessGroups()->sync($data['group_ids']);
        }

        if (array_key_exists('accesses', $data)) {
            $this->syncAccesses($user, $tenantId, $data['accesses']);
        }

        $this->audit->record('tenant', 'access.user_updated', "User #{$user->id}", null, ['tenant_id' => $tenantId]);

        $this->bumpUsersCache($tenantId);

        return response()->json(['data' => $this->userPayload($user->fresh('moduleAccesses'), $tenantId)]);
    }

    /**
     * Reseta a senha de um usuário (admin somente).
     * PUT /api/access/users/{user}/reset-password
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        $tenantId = app(TenantContext::class)->id();

        $this->assertCanWrite($actor, $tenantId);
        $this->ensureBelongsToTenant($user, $tenantId);

        $data = $request->validate([
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        $user->update(['password' => $data['password']]);

        $this->audit->record('tenant', 'access.user_password_reset', "User #{$user->id}", null, ['tenant_id' => $tenantId]);

        return response()->json(['message' => 'Senha redefinida com sucesso.']);
    }

    private function resolveOrCreateDefaultPassword(int $tenantId, int $actorId): string
    {
        $setting = \App\Models\TenantSecuritySetting::where('tenant_id', $tenantId)->first();

        if ($setting !== null && $setting->default_password_hash !== null) {
            $plain = $setting->getDefaultPasswordPlain();
            if ($plain !== null) {
                return $plain;
            }
        }

        $generated = $this->generateSecureDefaultPassword();
        $setting = \App\Models\TenantSecuritySetting::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                'default_password_hash' => \Illuminate\Support\Facades\Hash::make($generated),
                'updated_by' => $actorId,
                'default_password_set_at' => now(),
            ]
        );
        $setting->setDefaultPasswordPlain($generated);
        $setting->save();

        return $generated;
    }

    private function generateSecureDefaultPassword(): string
    {
        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
        $password = '';
        for ($i = 0; $i < 12; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $password;
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
                'can_create' => (bool) ($a['can_create'] ?? false),
                'can_edit' => (bool) ($a['can_edit'] ?? false),
                'can_delete' => (bool) ($a['can_delete'] ?? false),
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
     * Consulta a senha padrão do sistema do tenant (não retorna o hash).
     * GET /api/access/security/default-password
     */
    public function getDefaultPassword(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $this->assertCanWrite($request->user(), $tenantId);

        $setting = \App\Models\TenantSecuritySetting::where('tenant_id', $tenantId)->first();

        return response()->json([
            'data' => [
                'set' => $setting !== null && $setting->default_password_hash !== null,
                'updated_by' => $setting?->updated_by,
                'updated_at' => $setting?->default_password_set_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Define a senha padrão do sistema (somente admin geral/gestor do tenant).
     * PUT /api/access/security/default-password
     */
    public function setDefaultPassword(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $actor = $request->user();

        // Só admin geral (ou admin_tenant) pode alterar a senha padrão do sistema
        $isManager = $actor->is_platform_admin || $actor->isSupportAnalyst() || $actor->hasRole('admin_tenant', $tenantId);
        abort_unless($isManager, 403, 'Apenas o administrador geral do tenant pode alterar a senha padrão do sistema.');

        $data = $request->validate([
            'password' => ['required', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
        ]);

        $setting = \App\Models\TenantSecuritySetting::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                'default_password_hash' => \Illuminate\Support\Facades\Hash::make($data['password']),
                'updated_by' => $actor->id,
                'default_password_set_at' => now(),
            ]
        );
        $setting->setDefaultPasswordPlain($data['password']);
        $setting->save();

        $this->audit->record('access', 'security.default_password_set', "Tenant #{$tenantId}", null, ['updated_by' => $actor->id]);

        return response()->json([
            'message' => 'Senha padrão do sistema atualizada.',
            'data' => ['set' => true, 'updated_by' => $actor->id, 'updated_at' => $setting->default_password_set_at?->toISOString()],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user, int $tenantId): array
    {
        // Vínculo principal: busca direta na pivot para evitar tipagem genérica do Eloquent
        $primaryOrgUnitId = (int) \Illuminate\Support\Facades\DB::table('tenant_user')
            ->where('user_id', $user->id)
            ->where('tenant_id', $tenantId)
            ->value('primary_org_unit_id') ?: null;

        $groups = [];
        if ($user->relationLoaded('accessGroups')) {
            foreach ($user->accessGroups as $g) {
                /** @var \App\Models\AccessGroup $g */
                $cat = null;
                if ($g->relationLoaded('category')) {
                    /** @var \App\Models\AccessCategory|null $cat */
                    $cat = $g->category;
                }
                $groups[] = [
                    'id' => $g->id,
                    'name' => $g->name,
                    'category_id' => $g->category_id,
                    'category' => $cat?->name,
                ];
            }
        }

        /** @var \App\Models\Cargo|null $cargo */
        $cargo = $user->relationLoaded('cargo') ? $user->cargo : null;

        $accesses = [];
        foreach ($user->moduleAccesses as $a) {
            /** @var UserModuleAccess $a */
            if ($a->tenant_id !== $tenantId) {
                continue;
            }
            $accesses[] = [
                'module' => $a->module_alias,
                'role' => $a->role,
                'all_org_units' => $a->isUnrestricted(),
                'org_unit_ids' => $a->org_unit_ids ?? [],
                'can_manage_users' => (bool) $a->can_manage_users,
                'can_create' => (bool) $a->can_create,
                'can_edit' => (bool) $a->can_edit,
                'can_delete' => (bool) $a->can_delete,
            ];
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'matricula' => $user->matricula,
            'cargo_id' => $user->cargo_id,
            'cargo' => $cargo?->name,
            'primary_org_unit_id' => $primaryOrgUnitId,
            'groups' => $groups,
            'group_ids' => array_column($groups, 'id'),
            'is_active' => $user->is_active,
            'created_at' => $user->created_at,
            'accesses' => $accesses,
        ];
    }
}

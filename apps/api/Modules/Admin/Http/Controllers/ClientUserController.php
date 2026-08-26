<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\UserService;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Modules\Admin\Http\Requests\StoreTenantUserRequest;
use Modules\Admin\Http\Requests\UpdateTenantUserRequest;
use Modules\Admin\Http\Resources\UserResource;
use Modules\Admin\Policies\TenantUserPolicy;

/**
 * CRUD de usuários do tenant — acessado pelo admin_tenant no web-client (RN-USR-011)
 * Todas as rotas são protegidas por auth:sanctum + resolve.tenant
 */
final class ClientUserController
{
    public function __construct(
        private readonly UserService $userService,
        private readonly AuditLogger $audit,
        private readonly TenantUserPolicy $policy,
    ) {}

    /**
     * Lista usuários do tenant ativo (paginação, filtros search/role/status)
     * GET /api/users
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $filters = $request->only(['search', 'role', 'status']);
        $perPage = (int) $request->query('per_page', 25);

        /** @var \Illuminate\Pagination\LengthAwarePaginator<int, \App\Models\User> $users */
        $users = $this->userService->listTenantUsers($tenantId, $filters, $perPage);

        return UserResource::collection($users)->response();
    }

    /**
     * Detalhe de um usuário do tenant
     * GET /api/users/{user}
     */
public function show(Request $request, User $user): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $this->assertCan($request->user(), 'view', $user);

        return (new UserResource($user->load(['roles', 'tenants' => fn ($q) => $q->where('tenant_id', $tenantId)])))->response();
    }

    /**
     * Cria um novo usuário no tenant (admin_tenant pode criar pregoeiro, fiscal, membro, etc.)
     * POST /api/users
     */
    public function store(StoreTenantUserRequest $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $validated = $request->validated();

        $role = $this->resolveTenantRole($tenantId, $validated['role_slug']);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'is_systrat' => false,
            'is_active' => true,
        ]);

        $user->tenants()->syncWithoutDetaching([
            $tenantId => ['role_id' => $role->id, 'status' => 'active', 'is_primary' => false],
        ]);
        $user->roles()->syncWithoutDetaching([$role->id]);
        $user->clearPermissionCache();

        $this->audit->record('tenant', 'user.created', "User #{$user->id} in Tenant #{$tenantId}", null, $user->toArray());

        return (new UserResource($user->load(['roles', 'tenants'])))->response()->setStatusCode(201);
    }

    /**
     * Atualiza dados de um usuário do tenant (nome, e-mail, role, status)
     * PUT /api/users/{user}
     */
    public function update(UpdateTenantUserRequest $request, User $user): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $this->assertCan($request->user(), 'update', $user);

        $validated = $request->validated();
        $roleSlug = $validated['role_slug'] ?? null;
        unset($validated['role_slug']);

        $before = $user->fresh(['roles'])->toArray();

        if ($validated !== []) {
            $user->fill($validated)->save();
        }

        if ($roleSlug) {
            $role = $this->resolveTenantRole($tenantId, $roleSlug);

            $user->roles()->sync([$role->id]);
            $user->clearPermissionCache();
            $user->tenants()->updateExistingPivot($tenantId, ['role_id' => $role->id]);
        }

        $this->audit->record('tenant', 'user.updated', "User #{$user->id} in Tenant #{$tenantId}", $before, $user->fresh(['roles'])->toArray());

        return (new UserResource($user->fresh(['roles', 'tenants'])))->response();
    }

    /**
     * Desativa um usuário no tenant (motivo obrigatório)
     * POST /api/users/{user}/deactivate
     */
    public function deactivate(Request $request, User $user): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $this->assertCan($request->user(), 'deactivate', $user);

        $request->validate(['reason' => ['required', 'string', 'min:10']]);

        $this->userService->deactivate($user, (string) $request->string('reason'), $tenantId);

        return response()->json(['message' => 'Usuário desativado com sucesso.']);
    }

    /**
     * Reativa um usuário no tenant
     * POST /api/users/{user}/reactivate
     */
    public function reactivate(Request $request, User $user): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $this->assertCan($request->user(), 'reactivate', $user);

        $user->tenants()->updateExistingPivot($tenantId, ['status' => 'active']);
        $user->update(['is_active' => true]);

        $this->audit->record('tenant', 'user.reactivated', "User #{$user->id} in Tenant #{$tenantId}", null, $user->toArray());

        return (new UserResource($user->fresh(['roles', 'tenants'])))->response();
    }

    /**
     * Find or create a tenant-scoped role from the SYSTRAT template
     */
    private function resolveTenantRole(int $tenantId, string $slug): Role
    {
        $role = Role::where('slug', $slug)
            ->where('scope', 'tenant')
            ->where('tenant_id', $tenantId)
            ->first();

        if ($role) {
            return $role;
        }

        $template = Role::where('slug', $slug)
            ->where('scope', 'tenant')
            ->first();

        abort_unless($template instanceof Role, 422, "A role '{$slug}' não é uma role de tenant válida.");

        $role = Role::create([
            'name' => $template->name,
            'slug' => $template->slug,
            'scope' => 'tenant',
            'tenant_id' => $tenantId,
            'guard_name' => 'web',
            'is_system' => $template->is_system,
        ]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        return $role;
    }

    /**
     * Atribui uma role do tenant a um usuário
     * POST /api/users/{user}/roles
     */
    public function assignRole(Request $request, User $user): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $this->assertCan($request->user(), 'assignRole', $user);

        $request->validate([
            'role_slug' => ['required', 'string', 'max:80'],
        ]);

        $role = $this->resolveTenantRole($tenantId, (string) $request->input('role_slug'));

        $before = $user->fresh(['roles'])->toArray();

        $user->roles()->syncWithoutDetaching([$role->id]);
        $user->clearPermissionCache();
        $user->tenants()->updateExistingPivot($tenantId, ['role_id' => $role->id]);

        $this->audit->record('tenant', 'user.role_assigned', "User #{$user->id} Role #{$role->id}", $before, ['role_slug' => $role->slug]);

        return (new UserResource($user->fresh(['roles', 'tenants'])))->response();
    }

    /**
     * Remove o vínculo do usuário com o tenant (unlink) — NÃO deleta o usuário global
     * DELETE /api/users/{user}
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $this->assertCan($request->user(), 'deactivate', $user);

        $before = $user->toArray();

        $user->tenants()->detach($tenantId);
        $user->roles()->detach();
        $user->clearPermissionCache();

        $this->audit->record('tenant', 'user.unlinked', "User #{$user->id} from Tenant #{$tenantId}", $before, ['tenant_id' => $tenantId]);

        return response()->json(['message' => 'Vínculo do usuário com o tenant removido.']);
    }

    /**
     * Valida a TenantUserPolicy (anti-BOLA)
     * 403 se o ator não é gestor do tenant; 404 se o alvo não pertence ao tenant (não vaza existência)
     */
    private function assertCan(?User $actor, string $ability, User $target): void
    {
        if ($actor === null) {
            abort(401, 'Não autenticado.');
        }

        if (!$this->policy->viewAny($actor)) {
            abort(403, 'Você não tem permissão para executar esta ação neste tenant.');
        }

        if (!$this->policy->{$ability}($actor, $target)) {
            abort(404, 'Usuário não encontrado neste tenant.');
        }
    }
}

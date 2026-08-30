<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * CRUD de roles do tenant (client SaaS) — escopo 'tenant'.
 * GET    /api/access/roles — lista roles do tenant
 * POST   /api/access/roles — cria role
 * GET    /api/access/roles/{role} — mostra role
 * PUT    /api/access/roles/{role} — atualiza role + permissões
 * DELETE /api/access/roles/{role} — exclui role (se não for sistema)
 * GET    /api/access/permissions — lista todas as permissões disponíveis
 */
final class ClientRoleController
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $roles = Role::query()
            ->where('scope', 'tenant')
            ->where('tenant_id', $tenantId)
            ->with('permissions')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $roles->map(function (Role $r): array {
            $perms = $r->relationLoaded('permissions')
                ? $r->permissions->map(function ($p): array {
                    /** @var \App\Models\Permission $p */
                    return ['id' => $p->id, 'name' => $p->name, 'slug' => $p->slug, 'module' => $p->module ?? 'admin'];
                })->values()->all()
                : [];

            return [
                'id' => $r->id,
                'name' => $r->name,
                'slug' => $r->slug,
                'description' => $r->description,
                'is_system' => (bool) $r->is_system,
                'permissions' => $perms,
                'created_at' => $r->created_at?->toISOString(),
            ];
        })->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'slug' => 'required|string|max:80|unique:roles,slug',
            'description' => 'nullable|string|max:500',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $permissionIds = $data['permission_ids'] ?? [];
        unset($data['permission_ids']);

        $role = Role::create($data + [
            'guard_name' => 'web',
            'scope' => 'tenant',
            'tenant_id' => $tenantId,
            'is_system' => false,
        ]);
        $role->permissions()->sync($permissionIds);

        $this->audit->record('access', 'role.created', "Role #{$role->id}", null, $role->fresh('permissions')->toArray());

        return response()->json(['data' => $role->fresh('permissions')], 201);
    }

    public function show(Role $role): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $role->tenant_id !== $tenantId || $role->scope !== 'tenant', 404);

        return response()->json(['data' => $role->load('permissions')]);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $role->tenant_id !== $tenantId || $role->scope !== 'tenant', 404);

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'description' => 'nullable|string|max:500',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'integer|exists:permissions,id',
        ]);

        $before = $role->toArray();
        $permissionIds = $data['permission_ids'] ?? null;
        unset($data['permission_ids']);

        $role->fill($data)->save();
        if (is_array($permissionIds)) {
            $role->permissions()->sync($permissionIds);
        }

        $this->audit->record('access', 'role.updated', "Role #{$role->id}", $before, $role->fresh('permissions')->toArray());

        return response()->json(['data' => $role->fresh('permissions')]);
    }

    public function destroy(Role $role): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $role->tenant_id !== $tenantId || $role->scope !== 'tenant', 404);

        if ($role->is_system) {
            return response()->json(['message' => 'Não é possível excluir uma role de sistema.'], 422);
        }
        if ($role->users()->exists()) {
            return response()->json(['message' => 'Role em uso por usuários. Remova os vínculos antes.'], 422);
        }

        $before = $role->toArray();
        $role->delete();
        $this->audit->record('access', 'role.deleted', "Role #{$role->id}", $before, null);

        return response()->json(null, 204);
    }

    public function permissions(): JsonResponse
    {
        $perms = Permission::query()->orderBy('name')->get(['id', 'name', 'slug', 'module']);
        return response()->json(['data' => $perms]);
    }
}
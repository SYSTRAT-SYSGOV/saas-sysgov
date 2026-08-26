<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Http\Requests\StoreRoleRequest;
use Modules\Admin\Http\Requests\UpdateRoleRequest;
use Modules\Admin\Http\Resources\RoleResource;

final class RoleAdminController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly AuditLogger $audit
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $query = Role::query()->with('permissions')->latest();

        if ($request->filled('scope')) {
            $query->where('scope', $request->query('scope'));
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        $roles = $query->paginate((int) $request->query('per_page', 25));

        return RoleResource::collection($roles)->response();
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $this->authorize('create', Role::class);

        $validated = $request->validated();
        $permissionIds = $validated['permission_ids'] ?? [];
        unset($validated['permission_ids']);

        $role = \App\Models\Role::create($validated + ['guard_name' => 'web']);
        $role->permissions()->sync($permissionIds);

        app(\App\Support\AuditLogger::class)->record('admin', 'role.created', "Role #{$role->id}", null, $role->toArray());

        return (new RoleResource($role->fresh('permissions')))->response()->setStatusCode(201);
    }

    public function show(Role $role): JsonResponse
    {
        $this->authorize('view', $role);
        return (new RoleResource($role->load('permissions')))->response();
    }

    public function update(UpdateRoleRequest $request, Role $role): JsonResponse
    {
        $this->authorize('update', $role);

        $before = $role->toArray();
        $validated = $request->validated();
        $permissionIds = $validated['permission_ids'] ?? null;
        unset($validated['permission_ids']);

        $role->fill($validated)->save();
        if (is_array($permissionIds)) {
            $role->permissions()->sync($permissionIds);
        }

        app(\App\Support\AuditLogger::class)->record('admin', 'role.updated', "Role #{$role->id}", $before, $role->fresh('permissions')->toArray());

        return (new RoleResource($role->fresh('permissions')))->response();
    }

    public function destroy(Role $role): JsonResponse
    {
        $this->authorize('delete', $role);

        if ($role->is_system) {
            return response()->json(['message' => 'Não é possível excluir uma role de sistema.'], 422);
        }

        if ($role->users()->exists()) {
            return response()->json(['message' => 'Não é possível excluir uma role em uso.'], 422);
        }

        $before = $role->toArray();
        $role->delete();

        app(\App\Support\AuditLogger::class)->record('admin', 'role.deleted', "Role #{$role->id}", $before, null);

        return response()->json(null, 204);
    }
}
<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Role;
use App\Models\Permission;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Http\Requests\StoreRoleRequest;
use Modules\Admin\Http\Requests\UpdateRoleRequest;
use Modules\Admin\Http\Resources\RoleResource;

final class RoleController
{
    use AuthorizesRequests;

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);
        return response()->json(RoleResource::collection(Role::query()->with('permissions')->latest()->paginate(25)));
    }

    public function store(StoreRoleRequest $request, AuditLogger $audit): JsonResponse
    {
        $this->authorize('create', Role::class);
        $data = $request->validated();
        $permissionIds = $data['permission_ids'] ?? [];
        unset($data['permission_ids']);
        $role = DB::transaction(function () use ($data, $permissionIds): Role {
            $role = Role::create($data + ['guard_name' => 'web']);
            $role->permissions()->sync($permissionIds);
            return $role->load('permissions');
        });
        $audit->record('admin', 'created', 'role:'.$role->getKey(), null, $role->toArray());
        return response()->json(new RoleResource($role), 201);
    }

    public function show(Role $role): JsonResponse
    {
        $this->authorize('view', $role);
        return response()->json(new RoleResource($role->load('permissions')));
    }

    public function update(UpdateRoleRequest $request, Role $role, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $role);
        $before = $role->toArray();
        $data = $request->validated();
        $permissionIds = $data['permission_ids'] ?? null;
        unset($data['permission_ids']);
        $role->fill($data)->save();
        if (is_array($permissionIds)) {
            $role->permissions()->sync($permissionIds);
        }
        $audit->record('admin', 'updated', 'role:'.$role->getKey(), $before, $role->fresh()->load('permissions')->toArray());
        return response()->json(new RoleResource($role->fresh()->load('permissions')));
    }

    public function destroy(Role $role, AuditLogger $audit): JsonResponse
    {
        $this->authorize('delete', $role);
        if ($role->users()->exists()) {
            return response()->json(['message' => 'Não é possível excluir uma role em uso.'], 422);
        }
        $before = $role->toArray();
        $role->delete();
        $audit->record('admin', 'deleted', 'role:'.$role->getKey(), $before, null);
        return response()->json(null, 204);
    }
}

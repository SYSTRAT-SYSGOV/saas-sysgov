<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Permission;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Modules\Admin\Http\Requests\StorePermissionRequest;
use Modules\Admin\Http\Requests\UpdatePermissionRequest;
use Modules\Admin\Http\Resources\PermissionResource;

final class PermissionController
{
    use AuthorizesRequests;

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Permission::class);
        return PermissionResource::collection(Permission::query()->orderBy('module')->orderBy('name')->get())->response();
    }

    public function store(StorePermissionRequest $request, AuditLogger $audit): JsonResponse
    {
        $this->authorize('create', Permission::class);
        $permission = Permission::create($request->validated() + ['guard_name' => 'web']);
        $audit->record('admin', 'created', 'permission:'.$permission->getKey(), null, $permission->toArray());
        return (new PermissionResource($permission))->response()->setStatusCode(201);
    }

    public function show(Permission $permission): JsonResponse
    {
        $this->authorize('view', $permission);
        return (new PermissionResource($permission))->response();
    }

    public function update(UpdatePermissionRequest $request, Permission $permission, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $permission);
        $before = $permission->toArray();
        $permission->fill($request->validated())->save();
        $audit->record('admin', 'updated', 'permission:'.$permission->getKey(), $before, $permission->fresh()->toArray());
        return (new PermissionResource($permission))->response();
    }

    public function destroy(Permission $permission, AuditLogger $audit): JsonResponse
    {
        $this->authorize('delete', $permission);
        if ($permission->roles()->exists()) {
            return response()->json(['message' => 'Não é possível excluir uma permissão em uso.'], 422);
        }
        $before = $permission->toArray();
        $permission->delete();
        $audit->record('admin', 'deleted', 'permission:'.$permission->getKey(), $before, null);
        return response()->json(null, 204);
    }
}

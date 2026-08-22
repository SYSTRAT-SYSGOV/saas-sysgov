<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Role;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Http\Requests\StoreRoleRequest;

final class RoleController
{
    public function index(): JsonResponse { return response()->json(Role::query()->with('permissions')->latest()->paginate(25)); }
    public function store(StoreRoleRequest $request, AuditLogger $audit): JsonResponse
    {
        $data = $request->validated();
        $permissionIds = $data['permission_ids'] ?? [];
        unset($data['permission_ids']);
        $role = DB::transaction(function () use ($data, $permissionIds): Role { $role = Role::create($data + ['guard_name' => 'web']); $role->permissions()->sync($permissionIds); return $role->load('permissions'); });
        $audit->record('admin', 'created', 'role:'.$role->getKey(), null, $role->toArray());
        return response()->json($role, 201);
    }
}

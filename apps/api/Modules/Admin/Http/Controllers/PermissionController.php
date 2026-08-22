<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Permission;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Modules\Admin\Http\Requests\StorePermissionRequest;

final class PermissionController
{
    public function index(): JsonResponse { return response()->json(Permission::query()->orderBy('name')->paginate(50)); }
    public function store(StorePermissionRequest $request, AuditLogger $audit): JsonResponse
    {
        $permission = Permission::create($request->validated() + ['guard_name' => 'web']);
        $audit->record('admin', 'created', 'permission:'.$permission->getKey(), null, $permission->toArray());
        return response()->json($permission, 201);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use App\Support\AuditLogger;
use App\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Admin\Http\Requests\StoreUserRequest;
use Modules\Admin\Http\Requests\AssignRolesRequest;

final class UserController
{
    use AuthorizesRequests;

    public function index(): JsonResponse { return response()->json(User::query()->with('tenants:id,name,slug')->latest()->paginate(25)); }
    public function store(StoreUserRequest $request, AuditLogger $audit): JsonResponse
    {
        $this->authorize('create', User::class);
        $data = $request->validated();
        $tenantId = $data['tenant_id'] ?? null;
        $roleId = $data['role_id'] ?? null;
        unset($data['tenant_id'], $data['role_id']);
        if ($roleId && (!$tenantId || !Role::query()->whereKey($roleId)->where('tenant_id', $tenantId)->exists())) throw ValidationException::withMessages(['role_id' => 'A role deve pertencer ao tenant informado.']);
        $user = DB::transaction(function () use ($data, $tenantId, $roleId): User {
            $user = User::create($data);
            if ($tenantId) $user->tenants()->attach($tenantId, ['role_id' => $roleId]);
            if ($roleId) $user->roles()->attach($roleId);
            return $user;
        });
        $audit->record('admin', 'created', 'user:'.$user->getKey(), null, $user->load('tenants:id,name,slug')->toArray());
        return response()->json($user->load('tenants:id,name,slug'), 201);
    }

    public function assignRoles(AssignRolesRequest $request, User $user, AuditLogger $audit): JsonResponse
    {
        $this->authorize('assignRoles', User::class);
        $data = $request->validated();
        $roleIds = Role::query()->where('tenant_id', $data['tenant_id'])->whereIn('id', $data['role_ids'] ?? [])->pluck('id')->all();
        if (count($roleIds) !== count($data['role_ids'] ?? [])) throw ValidationException::withMessages(['role_ids' => 'Todas as roles devem pertencer ao tenant informado.']);
        if (!$user->tenants()->whereKey($data['tenant_id'])->exists()) throw ValidationException::withMessages(['tenant_id' => 'O usuário não está vinculado ao tenant informado.']);
        $before = $user->roles()->pluck('roles.id')->all();
        DB::transaction(function () use ($user, $roleIds, $data): void { $user->roles()->syncWithoutDetaching($roleIds); $user->tenants()->updateExistingPivot($data['tenant_id'], ['role_id' => $roleIds[0] ?? null]); });
        $audit->record('admin', 'roles.assigned', 'user:'.$user->getKey(), ['role_ids' => $before], ['role_ids' => $roleIds, 'tenant_id' => $data['tenant_id']]);
        return response()->json($user->load('roles'));
    }
}

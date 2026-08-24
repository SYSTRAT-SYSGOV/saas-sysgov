<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Support\AuditLogger;
use App\Models\Role;
use Modules\Admin\Http\Requests\StoreUserRequest;
use Modules\Admin\Http\Requests\UpdateUserRequest;
use Modules\Admin\Http\Requests\AssignRolesRequest;
use Modules\Admin\Http\Resources\UserResource;

final class UserController
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $query = User::query()->with(['tenants:id,name,slug', 'roles'])->latest();

        if ($q = $request->string('q')->toString()) {
            $query->where(function ($w) use ($q) {
                $w->where('name', 'like', "%{$q}%")
                  ->orWhere('email', 'like', "%{$q}%");
            });
        }

        return response()->json(UserResource::collection($query->paginate(25)));
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);
        return response()->json(new UserResource($user->load(['tenants:id,name,slug', 'roles'])));
    }

    public function store(StoreUserRequest $request, AuditLogger $audit): JsonResponse
    {
        $this->authorize('create', User::class);
        $data = $request->validated();
        $tenants = $data['tenants'] ?? [];
        unset($data['tenants'], $data['password_confirmation']);

        $user = DB::transaction(function () use ($data, $tenants): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'is_platform_admin' => (bool) ($data['is_platform_admin'] ?? false),
            ]);

            foreach ($tenants as $link) {
                $user->tenants()->attach($link['tenant_id'], ['role_id' => $link['role_id'] ?? null]);
            }
            return $user;
        });

        $audit->record('admin', 'created', 'user:'.$user->getKey(), null, $user->fresh()->load('tenants:id,name,slug')->toArray());
        return response()->json(new UserResource($user->load(['tenants:id,name,slug', 'roles'])), 201);
    }

    public function update(UpdateUserRequest $request, User $user, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $user);
        $before = $user->load('tenants:id,name,slug')->toArray();

        $data = $request->validated();
        $tenants = $data['tenants'] ?? null;
        unset($data['tenants'], $data['password_confirmation']);

        DB::transaction(function () use ($user, $data, $tenants): void {
            if (!empty($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            } else {
                unset($data['password']);
            }
            $user->fill($data)->save();

            if (is_array($tenants)) {
                $sync = [];
                foreach ($tenants as $link) {
                    $sync[$link['tenant_id']] = ['role_id' => $link['role_id'] ?? null];
                }
                $user->tenants()->sync($sync);
            }
        });

        $audit->record('admin', 'updated', 'user:'.$user->getKey(), $before, $user->fresh()->load('tenants:id,name,slug')->toArray());
        return response()->json(new UserResource($user->fresh()->load(['tenants:id,name,slug', 'roles'])));
    }

    public function assignRoles(AssignRolesRequest $request, User $user, AuditLogger $audit): JsonResponse
    {
        $this->authorize('assignRoles', User::class);
        $data = $request->validated();
        $roleIds = Role::query()->where('tenant_id', $data['tenant_id'])->whereIn('id', $data['role_ids'] ?? [])->pluck('id')->all();
        if (count($roleIds) !== count($data['role_ids'] ?? [])) {
            throw ValidationException::withMessages(['role_ids' => 'Todas as roles devem pertencer ao tenant informado.']);
        }
        if (!$user->tenants()->whereKey($data['tenant_id'])->exists()) {
            throw ValidationException::withMessages(['tenant_id' => 'O usuário não está vinculado ao tenant informado.']);
        }

        $before = $user->roles()->pluck('roles.id')->all();
        DB::transaction(function () use ($user, $roleIds, $data): void {
            $user->roles()->syncWithoutDetaching($roleIds);
            $user->tenants()->updateExistingPivot($data['tenant_id'], ['role_id' => $roleIds[0] ?? null]);
        });

        $audit->record('admin', 'roles.assigned', 'user:'.$user->getKey(), ['role_ids' => $before], ['role_ids' => $roleIds, 'tenant_id' => $data['tenant_id']]);
        return response()->json(new UserResource($user->fresh()->load('roles')));
    }

    public function destroy(User $user, AuditLogger $audit): JsonResponse
    {
        $this->authorize('delete', $user);

        if ($user->is_platform_admin) {
            $remaining = User::query()->where('is_platform_admin', true)->where('id', '!=', $user->id)->count();
            if ($remaining === 0) {
                throw ValidationException::withMessages(['user' => 'Não é possível excluir o último administrador da plataforma.']);
            }
        }

        $snapshot = $user->load('tenants:id,name,slug')->toArray();
        $user->delete();
        $audit->record('admin', 'deleted', 'user:'.$user->getKey(), $snapshot, null);
        return response()->json(null, 204);
    }
}

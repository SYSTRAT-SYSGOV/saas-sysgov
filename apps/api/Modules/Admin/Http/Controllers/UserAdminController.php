<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\User;
use App\Services\UserService;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Http\Requests\CreateTenantAdminRequest;
use Modules\Admin\Http\Requests\DeactivateUserRequest;
use Modules\Admin\Http\Requests\StoreSystratUserRequest;
use Modules\Admin\Http\Requests\UpdateSystratUserRequest;
use Modules\Admin\Http\Resources\UserResource;

final class UserAdminController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly UserService $userService,
        private readonly AuditLogger $audit
    ) {}

    /**
     * List SYSTRAT users with filters
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $filters = $request->only(['search', 'role', 'status', 'mfa_pending', 'per_page']);
        $perPage = (int) ($filters['per_page'] ?? 25);

        $users = $this->userService->listSystratUsers($filters, $perPage);

        return UserResource::collection($users)->response();
    }

    /**
     * Create a SYSTRAT user
     */
    public function store(StoreSystratUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        $user = $this->userService->createSystratUser($request->validated());

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * Show a SYSTRAT user
     */
    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return (new UserResource($user->load(['roles', 'tenants'])))->response();
    }

    /**
     * Update a SYSTRAT user
     */
    public function update(UpdateSystratUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $user = $this->userService->update($user, $request->validated());

        return (new UserResource($user->fresh(['roles', 'tenants'])))->response();
    }

    /**
     * Delete a SYSTRAT user
     */
    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $this->userService->delete($user);

        return response()->json(null, 204);
    }

    /**
     * Deactivate a SYSTRAT user
     */
    public function deactivate(DeactivateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('deactivate', $user);

        $this->userService->deactivate($user, (string) $request->string('reason'));

        return response()->json(['message' => 'Usuário desativado com sucesso.']);
    }

    /**
     * Reactivate a SYSTRAT user
     */
    public function reactivate(User $user): JsonResponse
    {
        $this->authorize('reactivate', $user);

        $this->userService->reactivate($user);

        return (new UserResource($user->fresh(['roles', 'tenants'])))->response();
    }

    /**
     * Request password reset for a user
     */
    public function requestPasswordReset(User $user): JsonResponse
    {
        $this->authorize('resetPassword', $user);

        $this->userService->requestPasswordReset($user->email);

        return response()->json(['message' => 'E-mail de reset de senha enviado.']);
    }

    /**
     * Create tenant admin (onboarding)
     */
    public function createTenantAdmin(CreateTenantAdminRequest $request): JsonResponse
    {
        $this->authorize('createTenantAdmin', User::class);

        $tenant = \App\Models\Tenant::findOrFail($request->route('tenant'));

        // RN-USR-011: onboarding idempotente — 409 se já existe admin ativo
        $existingAdmin = User::whereHas('tenants', function ($q) use ($tenant) {
            $q->where('tenants.id', $tenant->id)->where('tenant_user.status', 'active');
        })->whereHas('roles', function ($q) {
            $q->where('slug', 'admin_tenant');
        })->first();

        if ($existingAdmin) {
            return response()->json([
                'message' => 'Este tenant já possui um administrador ativo.',
                'data' => new UserResource($existingAdmin->load(['roles', 'tenants'])),
            ], 409);
        }

        $user = $this->userService->createTenantAdmin($tenant, $request->validated());

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * List tenant users (read-only for support)
     */
    public function listTenantUsers(Request $request): JsonResponse
    {
        $this->authorize('viewTenantUsers', User::class);

        $tenant = \App\Models\Tenant::findOrFail($request->route('tenant'));
        $filters = $request->only(['search', 'per_page']);
        $perPage = (int) ($filters['per_page'] ?? 25);

        $users = $this->userService->listTenantUsers($tenant->id, $filters, $perPage);

        return response()->json(UserResource::collection($users));
    }

    /**
     * Show tenant user (read-only)
     */
    public function showTenantUser(Request $request): JsonResponse
    {
        $this->authorize('viewTenantUser', User::class);

        $tenant = \App\Models\Tenant::findOrFail($request->route('tenant'));
        $user = User::with(['roles', 'tenants' => fn ($q) => $q->where('tenant_id', $tenant->id)])
            ->findOrFail($request->route('user'));

        return response()->json(new UserResource($user));
    }

    /**
     * Emergency deactivation of tenant user
     */
    public function deactivateTenantUser(DeactivateUserRequest $request): JsonResponse
    {
        $this->authorize('deactivateTenantUser', User::class);

        $tenant = \App\Models\Tenant::findOrFail($request->route('tenant'));
        $user = User::findOrFail($request->route('user'));

        $this->userService->deactivate($user, (string) $request->string('reason'), $tenant->id);

        return response()->json(['message' => 'Vínculo do usuário com o tenant desativado.']);
    }
}
<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\User;
use App\Services\TenantAdminGuard;
use App\Services\UserService;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Http\Requests\CreateTenantAdminRequest;
use Modules\Admin\Http\Requests\DeactivateUserRequest;
use Modules\Admin\Http\Requests\StoreSystratUserRequest;
use Modules\Admin\Http\Requests\UpdateSystratUserRequest;
use Modules\Admin\Http\Requests\UpdateTenantAdminRequest;
use Modules\Admin\Http\Resources\UserResource;

final class UserAdminController
{
    use AuthorizesRequests;

    private readonly TenantAdminGuard $guard;

    public function __construct(
        private readonly UserService $userService,
        private readonly AuditLogger $audit
    ) {
        $this->guard = new TenantAdminGuard();
    }

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
        if ($user->is($this->currentUser())) {
            abort(403, 'Não é possível excluir a própria conta de administrador.');
        }

        $this->authorize('delete', $user);

        $this->userService->delete($user);

        return response()->json(null, 204);
    }

    /**
     * Deactivate a SYSTRAT user
     */
    public function deactivate(DeactivateUserRequest $request, User $user): JsonResponse
    {
        if ($user->is($this->currentUser())) {
            abort(403, 'Não é possível desativar a própria conta de administrador.');
        }

        $this->authorize('deactivate', $user);

        $this->userService->deactivate($user, (string) $request->string('reason'));

        return response()->json(['message' => 'Usuário desativado com sucesso.']);
    }

    private function currentUser(): ?User
    {
        return request()->user() ?? \Illuminate\Support\Facades\Auth::user();
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
     * Lista os administradores (ativos e inativos) do tenant
     * GET /api/admin/tenants/{tenant}/users/admins
     */
    public function listTenantAdmins(Request $request): JsonResponse
    {
        $this->authorize('viewTenantUsers', User::class);

        $tenant = \App\Models\Tenant::findOrFail($request->route('tenant'));

        $admins = User::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id))
            ->whereHas('roles', fn ($q) => $q->where('slug', 'admin_tenant')->where('roles.tenant_id', $tenant->id))
            ->with(['roles', 'tenants' => fn ($q) => $q->where('tenants.id', $tenant->id)])
            ->orderBy('name')
            ->get();

        return UserResource::collection($admins)->response();
    }

    /**
     * Cadastra um administrador do tenant (onboarding) — o tenant pode ter vários
     * POST /api/admin/tenants/{tenant}/users/admin
     */
    public function createTenantAdmin(CreateTenantAdminRequest $request): JsonResponse
    {
        $this->authorize('createTenantAdmin', User::class);

        $tenant = \App\Models\Tenant::findOrFail($request->route('tenant'));

        // Idempotência por e-mail: 409 somente se esse e-mail já é administrador ativo DESTE tenant
        $existingAdmin = $this->guard->activeAdmins($tenant->id)
            ->where('email', (string) $request->input('email'))
            ->first();

        if ($existingAdmin) {
            return response()->json([
                'message' => 'Este administrador já está cadastrado neste tenant.',
                'data' => new UserResource($existingAdmin->load(['roles', 'tenants'])),
            ], 409);
        }

        $user = $this->userService->createTenantAdmin($tenant, $request->validated());

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * Atualiza (nome e/ou senha) um administrador específico do tenant
     * PUT /api/admin/tenants/{tenant}/users/admin/{user}
     * Sem {user}: aceito apenas quando o tenant tem exatamente um administrador ativo.
     */
    public function updateTenantAdmin(UpdateTenantAdminRequest $request): JsonResponse
    {
        $this->authorize('updateTenantAdmin', User::class);

        $tenant = \App\Models\Tenant::findOrFail($request->route('tenant'));
        $adminsQuery = fn () => User::whereHas('tenants', function ($q) use ($tenant) {
            $q->where('tenants.id', $tenant->id);
        })->whereHas('roles', function ($q) use ($tenant) {
            $q->where('slug', 'admin_tenant')->where('roles.tenant_id', $tenant->id);
        });

        $userId = $request->route('user');
        if ($userId !== null) {
            $admin = $adminsQuery()->whereKey($userId)->first();
            if (!$admin) {
                return response()->json(['message' => 'Administrador não encontrado neste tenant.'], 404);
            }
        } else {
            $active = $this->guard->activeAdmins($tenant->id)->get();
            if ($active->isEmpty()) {
                return response()->json([
                    'message' => 'Este tenant ainda não possui um administrador ativo. Use o onboarding para criar o primeiro.',
                ], 404);
            }
            if ($active->count() > 1) {
                return response()->json([
                    'message' => 'Este tenant possui mais de um administrador. Informe o administrador a ser atualizado.',
                ], 422);
            }
            $admin = $active->first();
        }

        $data = $request->validated();
        if (($data['password'] ?? null) === '') {
            unset($data['password']);
        }

        $before = $admin->fresh(['roles'])?->toArray();
        $user = $this->userService->update($admin, $data);
        $this->audit->record('admin', 'tenant_admin.updated', "TenantAdmin #{$admin->id}@#{$tenant->id}", $before, $user->fresh(['roles'])?->toArray());

        return (new UserResource($user->fresh(['roles', 'tenants'])))->response();
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

        return UserResource::collection($users)->response();
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

        $this->userService->deactivate($user, (string) $request->input('reason'), $tenant->id, emergency: true);

        return response()->json(['message' => 'Vínculo do usuário com o tenant desativado.']);
    }
}
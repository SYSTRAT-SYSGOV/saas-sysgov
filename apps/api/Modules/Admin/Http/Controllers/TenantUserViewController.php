<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Http\Resources\UserResource;

final class TenantUserViewController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly UserService $userService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewTenantUsers', User::class);

        $tenant = Tenant::findOrFail($request->route('tenant'));
        $filters = $request->only(['search', 'per_page']);
        $perPage = (int) ($filters['per_page'] ?? 25);

        $users = $this->userService->listTenantUsers($tenant->id, $filters, $perPage);

        return UserResource::collection($users)->response();
    }

    public function show(Request $request): JsonResponse
    {
        $this->authorize('viewTenantUser', User::class);

        $tenant = Tenant::findOrFail($request->route('tenant'));
        $user = User::with(['roles', 'tenants' => fn ($q) => $q->where('tenant_id', $tenant->id)])
            ->findOrFail($request->route('user'));

        return (new UserResource($user))->response();
    }

    public function deactivate(Request $request): JsonResponse
    {
        $this->authorize('deactivateTenantUser', User::class);

        $tenant = Tenant::findOrFail($request->route('tenant'));
        $user = User::findOrFail($request->route('user'));

        // Need to use UserService to deactivate
        $userService = app(\App\Services\UserService::class);
        $userService->deactivate($user, (string) $request->string('reason'), $tenant->id);

        return response()->json(['message' => 'Vínculo do usuário com o tenant desativado.']);
    }
}
<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\ModuleAccessService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

final class AccessController
{
    public function __construct(
        private readonly ModuleAccessService $access,
    ) {}

    public function matrix(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        Gate::authorize('viewAny', [UserModuleAccess::class, $tenantId]);

        $rows = UserModuleAccess::query()
            ->where('tenant_id', $tenantId)
            ->with(['user:id,name,email', 'grantor:id,name'])
            ->orderBy('module_alias')
            ->get()
            ->map(function (UserModuleAccess $a): array {
                /** @var \App\Models\User|null $user */
                $user = $a->user;
                /** @var \App\Models\User|null $grantor */
                $grantor = $a->grantor;

                return [
                    'id' => $a->id,
                    'user_id' => $a->user_id,
                    'user_name' => $user?->name,
                    'user_email' => $user?->email,
                    'module' => $a->module_alias,
                    'role' => $a->role,
                    'all_org_units' => $a->isUnrestricted(),
                    'org_unit_ids' => $a->org_unit_ids ?? [],
                    'can_manage_users' => $a->can_manage_users,
                    'status' => $a->status,
                    'valid_from' => $a->valid_from?->toISOString(),
                    'valid_to' => $a->valid_to?->toISOString(),
                    'expiring' => $a->isExpiring(30),
                    'granted_by' => $grantor?->name,
                ];
            });

        return response()->json(['data' => $rows]);
    }

    public function modules(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        Gate::authorize('viewAny', [UserModuleAccess::class, $tenantId]);

        $moduleAccesses = UserModuleAccess::query()
            ->where('tenant_id', $tenantId)
            ->with('user:id,name,email')
            ->get()
            ->groupBy('module_alias')
            ->map(function ($rows, string $module): array {
                return [
                    'module' => $module,
                    'users' => $rows->map(function (UserModuleAccess $a): array {
                        /** @var \App\Models\User|null $user */
                        $user = $a->user;

                        return [
                            'user_id' => $a->user_id,
                            'user_name' => $user?->name,
                            'role' => $a->role,
                            'all_org_units' => $a->isUnrestricted(),
                            'can_manage_users' => $a->can_manage_users,
                            'status' => $a->status,
                            'valid_to' => $a->valid_to?->toISOString(),
                        ];
                    })->values()->all(),
                ];
            })
            ->values();

        return response()->json(['data' => $moduleAccesses]);
    }

    public function expiring(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        Gate::authorize('viewAny', [UserModuleAccess::class, $tenantId]);

        $rows = UserModuleAccess::query()
            ->where('tenant_id', $tenantId)
            ->where('status', UserModuleAccess::STATUS_ACTIVE)
            ->whereNotNull('valid_to')
            ->where('valid_to', '<=', now()->addDays(30))
            ->where('valid_to', '>', now())
            ->with('user:id,name,email')
            ->orderBy('valid_to')
            ->get()
            ->map(function (UserModuleAccess $a): array {
                /** @var \App\Models\User|null $user */
                $user = $a->user;

                return [
                    'id' => $a->id,
                    'user_id' => $a->user_id,
                    'user_name' => $user?->name,
                    'user_email' => $user?->email,
                    'module' => $a->module_alias,
                    'role' => $a->role,
                    'valid_to' => $a->valid_to?->toISOString(),
                    'days_left' => $a->valid_to ? now()->diffInDays($a->valid_to, false) : null,
                ];
            });

        return response()->json(['data' => $rows]);
    }

    public function grant(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $actor = $request->user();
        abort_if($actor === null, 401, 'Não autenticado.');

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'module_alias' => 'required|string|max:80',
            'role' => 'nullable|string|max:40',
            'org_unit_ids' => 'nullable|array',
            'org_unit_ids.*' => 'integer|exists:org_units,id',
            'can_manage_users' => 'nullable|boolean',
            'valid_to' => 'nullable|date|after:now',
        ]);

        $target = User::findOrFail($data['user_id']);

        Gate::authorize('create', [UserModuleAccess::class, $tenantId, $data['module_alias'], $data['org_unit_ids'] ?? []]);

        $access = $this->access->grantAccess($target, $tenantId, $data['module_alias'], $data, $actor);

        return response()->json(['data' => $access->fresh()->load(['user:id,name,email', 'grantor:id,name'])], 201);
    }

    public function revoke(Request $request, UserModuleAccess $access): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $actor = $request->user();
        abort_if($actor === null, 401, 'Não autenticado.');
        abort_if((int) $access->tenant_id !== $tenantId, 404, 'Acesso não encontrado neste tenant.');

        Gate::authorize('revoke', [$access, $tenantId]);

        $this->access->revokeAccess($access, $actor, $request->input('reason'));

        return response()->json(['message' => 'Acesso revogado com sucesso.']);
    }

    public function renew(Request $request, UserModuleAccess $access): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $access->tenant_id !== $tenantId, 404, 'Acesso não encontrado neste tenant.');

        Gate::authorize('renew', [$access, $tenantId]);

        $validTo = $request->date('valid_to');
        $this->access->renewAccess($access, $validTo);

        return response()->json(['message' => 'Acesso renovado com sucesso.', 'valid_to' => $access->fresh()->valid_to?->toISOString()]);
    }
}
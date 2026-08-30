<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\AccessCategory;
use App\Models\AccessGroup;
use App\Models\AccessGroupAccess;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestão de Categorias e Grupos de Acesso (herança de permissões para vários usuários).
 *
 * GET  /api/access/categories           — lista categorias com seus grupos
 * POST /api/access/categories           — cria categoria
 * PUT  /api/access/categories/{id}      — renomeia categoria
 * DELETE /api/access/categories/{id}    — remove categoria (grupos ficam sem categoria)
 * GET  /api/access/groups               — lista grupos com acessos e contagem de usuários
 * POST /api/access/groups               — cria grupo (com acessos opcionais)
 * PUT  /api/access/groups/{group}       — atualiza grupo + acessos (substitui matriz)
 * DELETE /api/access/groups/{group}     — remove grupo (vínculos removidos em cascata)
 * POST /api/access/groups/{group}/users — atribui usuários ao grupo (array user_ids)
 * DELETE /api/access/groups/{group}/users/{user} — remove usuário do grupo
 */
final class AccessGroupController
{
    public function categories(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $categories = AccessCategory::query()
            ->where('tenant_id', $tenantId)
            ->withCount('groups')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:1000',
        ]);

        $category = AccessCategory::create(['tenant_id' => $tenantId, ...$data]);

        return response()->json(['data' => $category], 201);
    }

    public function updateCategory(Request $request, AccessCategory $category): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $category->tenant_id !== $tenantId, 404);

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'description' => 'nullable|string|max:1000',
        ]);

        $category->update($data);

        return response()->json(['data' => $category->fresh()]);
    }

    public function destroyCategory(AccessCategory $category): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $category->tenant_id !== $tenantId, 404);

        $category->delete();

        return response()->json(null, 204);
    }

    public function groups(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $groups = AccessGroup::query()
            ->where('tenant_id', $tenantId)
            ->with(['category:id,name', 'accesses'])
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $groups]);
    }

    public function storeGroup(Request $request): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        $data = $request->validate([
            'category_id' => 'nullable|exists:access_categories,id',
            'name' => 'required|string|max:120',
            'description' => 'nullable|string|max:1000',
            'accesses' => 'sometimes|array',
            'accesses.*.module_alias' => 'required|string|max:80',
            'accesses.*.role' => 'nullable|string|max:40',
            'accesses.*.org_unit_ids' => 'nullable|array',
            'accesses.*.org_unit_ids.*' => 'integer',
            'accesses.*.can_manage_users' => 'sometimes|boolean',
            'accesses.*.can_create' => 'sometimes|boolean',
            'accesses.*.can_edit' => 'sometimes|boolean',
            'accesses.*.can_delete' => 'sometimes|boolean',
            'accesses.*.valid_to' => 'nullable|date',
        ]);

        $group = AccessGroup::create([
            'tenant_id' => $tenantId,
            'category_id' => $data['category_id'] ?? null,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active' => true,
        ]);

        $this->syncAccesses($group, $tenantId, $data['accesses'] ?? []);

        return response()->json(['data' => $group->fresh(['category:id,name', 'accesses'])], 201);
    }

    public function updateGroup(Request $request, AccessGroup $group): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $group->tenant_id !== $tenantId, 404);

        $data = $request->validate([
            'category_id' => 'nullable|exists:access_categories,id',
            'name' => 'sometimes|string|max:120',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'sometimes|boolean',
            'accesses' => 'sometimes|array',
            'accesses.*.module_alias' => 'required|string|max:80',
            'accesses.*.role' => 'nullable|string|max:40',
            'accesses.*.org_unit_ids' => 'nullable|array',
            'accesses.*.org_unit_ids.*' => 'integer',
            'accesses.*.can_manage_users' => 'sometimes|boolean',
            'accesses.*.can_create' => 'sometimes|boolean',
            'accesses.*.can_edit' => 'sometimes|boolean',
            'accesses.*.can_delete' => 'sometimes|boolean',
            'accesses.*.valid_to' => 'nullable|date',
        ]);

        $group->update(array_intersect_key($data, array_flip(['category_id', 'name', 'description', 'is_active'])));

        if (array_key_exists('accesses', $data)) {
            $this->syncAccesses($group, $tenantId, $data['accesses']);
        }

        return response()->json(['data' => $group->fresh(['category:id,name', 'accesses'])]);
    }

    public function destroyGroup(AccessGroup $group): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $group->tenant_id !== $tenantId, 404);

        $group->delete();

        return response()->json(null, 204);
    }

    public function assignUsers(Request $request, AccessGroup $group): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $group->tenant_id !== $tenantId, 404);

        $data = $request->validate([
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'integer|exists:users,id',
        ]);

        // Só atribui usuários do mesmo tenant
        $validIds = User::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId))
            ->whereIn('id', $data['user_ids'])
            ->pluck('id')
            ->all();

        $group->users()->syncWithoutDetaching($validIds);

        return response()->json(['data' => ['assigned' => count($validIds), 'users' => $group->fresh('users')->users->pluck('id')]]);
    }

    public function removeUser(AccessGroup $group, User $user): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        abort_if((int) $group->tenant_id !== $tenantId, 404);

        $group->users()->detach($user->id);

        return response()->json(null, 204);
    }

    /**
     * @param array<int, array<string, mixed>> $accesses
     */
    private function syncAccesses(AccessGroup $group, int $tenantId, array $accesses): void
    {
        AccessGroupAccess::where('access_group_id', $group->id)->delete();

        foreach ($accesses as $a) {
            AccessGroupAccess::create([
                'access_group_id' => $group->id,
                'tenant_id' => $tenantId,
                'module_alias' => $a['module_alias'],
                'role' => $a['role'] ?? 'viewer',
                'org_unit_ids' => $a['org_unit_ids'] ?? null,
                'can_manage_users' => (bool) ($a['can_manage_users'] ?? false),
                'can_create' => (bool) ($a['can_create'] ?? false),
                'can_edit' => (bool) ($a['can_edit'] ?? false),
                'can_delete' => (bool) ($a['can_delete'] ?? false),
                'valid_to' => $a['valid_to'] ?? null,
            ]);
        }
    }
}
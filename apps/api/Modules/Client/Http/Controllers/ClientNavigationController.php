<?php

declare(strict_types=1);

namespace Modules\Client\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;
use Modules\Client\Services\ClientNavigationService;

final class ClientNavigationController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly ClientNavigationService $service,
        private readonly TenantContext $tenants,
    ) {}

    public function navigation(Request $request): JsonResponse
    {
        $tenantId = $this->tenants->id();
        $user = $request->user();
        $activeModules = $request->input('modules', []);
        $permissions = $request->input('permissions', []);

        $nav = $this->service->buildNavigation($tenantId, $user, $activeModules, $permissions);

        return response()->json($nav);
    }

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ClientMenuGroup::class);

        $tenantId = $this->tenants->id();

        $groups = ClientMenuGroup::query()
            ->where(fn ($q) => $q->where('tenant_id', $tenantId)->orWhereNull('tenant_id'))
            ->with('items')
            ->orderBy('order')
            ->get();

        return response()->json(['data' => $groups]);
    }

    public function storeGroup(Request $request): JsonResponse
    {
        $this->authorize('create', ClientMenuGroup::class);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:80', "unique:client_menu_groups,slug,NULL,id,tenant_id,{$this->tenants->id()}"],
            'icon' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer'],
        ]);

        $group = ClientMenuGroup::create([
            'tenant_id' => $this->tenants->id(),
            'name' => $data['name'],
            'slug' => $data['slug'],
            'icon' => $data['icon'] ?? null,
            'order' => $data['order'] ?? 0,
            'is_active' => true,
        ]);

        return response()->json(['data' => $group], 201);
    }

    public function updateGroup(Request $request, ClientMenuGroup $group): JsonResponse
    {
        $this->authorize('update', $group);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'slug' => ['sometimes', 'string', 'max:80', "unique:client_menu_groups,slug,{$group->id},id,tenant_id,{$this->tenants->id()}"],
            'icon' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $group->update($data);

        return response()->json(['data' => $group->fresh()]);
    }

    public function destroyGroup(ClientMenuGroup $group): JsonResponse
    {
        $this->authorize('delete', $group);
        $group->delete();
        return response()->json(null, 204);
    }

    public function storeItem(Request $request): JsonResponse
    {
        $this->authorize('create', ClientMenuItem::class);

        $data = $request->validate([
            'menu_group_id' => ['required', 'integer', 'exists:client_menu_groups,id'],
            'label' => ['required', 'string', 'max:100'],
            'route' => ['required', 'string', 'max:200'],
            'icon' => ['nullable', 'string', 'max:50'],
            'permission' => ['nullable', 'string', 'max:100'],
            'shortcut' => ['nullable', 'string', 'max:10'],
            'module_alias' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer'],
        ]);

        $item = ClientMenuItem::create([
            'menu_group_id' => $data['menu_group_id'],
            'label' => $data['label'],
            'route' => $data['route'],
            'icon' => $data['icon'] ?? null,
            'permission' => $data['permission'] ?? null,
            'shortcut' => $data['shortcut'] ?? null,
            'module_alias' => $data['module_alias'] ?? null,
            'order' => $data['order'] ?? 0,
            'is_active' => true,
        ]);

        return response()->json(['data' => $item], 201);
    }

    public function updateItem(Request $request, ClientMenuItem $item): JsonResponse
    {
        $this->authorize('update', $item);

        $data = $request->validate([
            'label' => ['sometimes', 'string', 'max:100'],
            'route' => ['sometimes', 'string', 'max:200'],
            'icon' => ['nullable', 'string', 'max:50'],
            'permission' => ['nullable', 'string', 'max:100'],
            'shortcut' => ['nullable', 'string', 'max:10'],
            'module_alias' => ['nullable', 'string', 'max:50'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $item->update($data);

        return response()->json(['data' => $item->fresh()]);
    }

    public function destroyItem(ClientMenuItem $item): JsonResponse
    {
        $this->authorize('delete', $item);
        $item->delete();
        return response()->json(null, 204);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Support\AuditLogger;
use Modules\Admin\Http\Requests\StoreMenuGroupRequest;
use Modules\Admin\Http\Requests\StoreMenuItemRequest;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;
use Modules\Admin\Services\MenuService;

final class MenuController
{
    use AuthorizesRequests;

    public function __construct(private readonly MenuService $service, private readonly TenantContext $tenants) {}

    public function navigation(Request $request): JsonResponse
    {
        $tenantId = $this->tenants->hasTenant() ? $this->tenants->id() : null;
        $user = $request->user();
        return response()->json($this->service->buildNavigation($tenantId, $user));
    }

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', MenuGroup::class);
        return response()->json(MenuGroup::with('items')->orderBy('order')->get());
    }

    public function storeGroup(StoreMenuGroupRequest $request, AuditLogger $audit): JsonResponse
    {
        $this->authorize('create', MenuGroup::class);
        $group = MenuGroup::create($request->validated());
        $audit->record('admin', 'menu_group_created', 'menu_group:'.$group->getKey(), null, $group->toArray());
        return response()->json($group, 201);
    }

    public function updateGroup(StoreMenuGroupRequest $request, MenuGroup $group, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $group);
        $before = $group->toArray();
        $group->update($request->validated());
        $audit->record('admin', 'menu_group_updated', 'menu_group:'.$group->getKey(), $before, $group->toArray());
        return response()->json($group->fresh());
    }

    public function destroyGroup(MenuGroup $group, AuditLogger $audit): JsonResponse
    {
        $this->authorize('delete', $group);
        $snapshot = $group->toArray();
        $group->delete();
        $audit->record('admin', 'menu_group_deleted', 'menu_group:'.$group->getKey(), $snapshot, null);
        return response()->json(null, 204);
    }

    public function storeItem(StoreMenuItemRequest $request, AuditLogger $audit): JsonResponse
    {
        $this->authorize('create', MenuItem::class);
        $item = MenuItem::create($request->validated());
        $audit->record('admin', 'menu_item_created', 'menu_item:'.$item->getKey(), null, $item->toArray());
        return response()->json($item, 201);
    }

    public function updateItem(StoreMenuItemRequest $request, MenuItem $item, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $item);
        $before = $item->toArray();
        $item->update($request->validated());
        $audit->record('admin', 'menu_item_updated', 'menu_item:'.$item->getKey(), $before, $item->toArray());
        return response()->json($item->fresh());
    }

    public function destroyItem(MenuItem $item, AuditLogger $audit): JsonResponse
    {
        $this->authorize('delete', $item);
        $snapshot = $item->toArray();
        $item->delete();
        $audit->record('admin', 'menu_item_deleted', 'menu_item:'.$item->getKey(), $snapshot, null);
        return response()->json(null, 204);
    }
}

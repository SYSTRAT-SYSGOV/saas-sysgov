<?php

declare(strict_types=1);

namespace Modules\Client\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;
use Modules\Client\Tests\TestCase;

/**
 * Regressão do BOLA cross-tenant: ClientMenuGroupPolicy/ClientMenuItemPolicy antes
 * declaravam update()/delete() sem o parâmetro do modelo, então o Gate ignorava
 * o objeto alvo e um admin_tenant de um tenant conseguia mutar menu de outro
 * tenant só sabendo o ID.
 */
final class MenuTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private function makeAdminTenant(Tenant $tenant, string $email): User
    {
        $role = Role::create([
            'name' => 'Administrador do Tenant',
            'slug' => 'admin_tenant',
            'scope' => 'tenant',
            'tenant_id' => $tenant->id,
            'guard_name' => 'web',
            'is_system' => true,
        ]);

        $user = User::create([
            'name' => 'Admin',
            'email' => $email,
            'password' => 'StrongPass!123',
            'is_active' => true,
        ]);
        $user->roles()->syncWithoutDetaching([$role->id]);
        $user->tenants()->syncWithoutDetaching([$tenant->id => ['role_id' => $role->id, 'status' => 'active']]);

        return $user;
    }

    public function test_admin_of_tenant_a_cannot_update_menu_group_of_tenant_b(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a-menu', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b-menu', 'type' => 'prefeitura', 'status' => 'active']);
        $adminA = $this->makeAdminTenant($tenantA, 'admin.a@teste.gov');

        app(TenantContext::class)->set($tenantB);
        $groupB = ClientMenuGroup::create(['tenant_id' => $tenantB->id, 'name' => 'Grupo B', 'slug' => 'grupo-b', 'is_active' => true, 'order' => 1]);
        app(TenantContext::class)->clear();

        $response = $this->actingAs($adminA)
            ->withHeaders(['X-Tenant-ID' => (string) $tenantA->id])
            ->putJson("/api/client/menus/groups/{$groupB->id}", ['name' => 'Hackeado']);

        $response->assertStatus(403);
        $this->assertSame('Grupo B', $groupB->fresh()->name);
    }

    public function test_admin_of_tenant_a_cannot_delete_menu_item_of_tenant_b(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a-item', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b-item', 'type' => 'prefeitura', 'status' => 'active']);
        $adminA = $this->makeAdminTenant($tenantA, 'admin.a2@teste.gov');

        app(TenantContext::class)->set($tenantB);
        $groupB = ClientMenuGroup::create(['tenant_id' => $tenantB->id, 'name' => 'Grupo B', 'slug' => 'grupo-b-2', 'is_active' => true, 'order' => 1]);
        $itemB = ClientMenuItem::create(['menu_group_id' => $groupB->id, 'label' => 'Item B', 'route' => '/b', 'order' => 1, 'is_active' => true]);
        app(TenantContext::class)->clear();

        $response = $this->actingAs($adminA)
            ->withHeaders(['X-Tenant-ID' => (string) $tenantA->id])
            ->deleteJson("/api/client/menus/items/{$itemB->id}");

        $response->assertStatus(403);
        $this->assertNotNull($itemB->fresh());
    }

    public function test_admin_of_tenant_a_cannot_reorder_menu_items_of_tenant_b(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a-reorder', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b-reorder', 'type' => 'prefeitura', 'status' => 'active']);
        $adminA = $this->makeAdminTenant($tenantA, 'admin.a3@teste.gov');

        app(TenantContext::class)->set($tenantB);
        $groupB = ClientMenuGroup::create(['tenant_id' => $tenantB->id, 'name' => 'Grupo B', 'slug' => 'grupo-b-3', 'is_active' => true, 'order' => 1]);
        $itemB = ClientMenuItem::create(['menu_group_id' => $groupB->id, 'label' => 'Item B', 'route' => '/b', 'order' => 1, 'is_active' => true]);
        app(TenantContext::class)->clear();

        $response = $this->actingAs($adminA)
            ->withHeaders(['X-Tenant-ID' => (string) $tenantA->id])
            ->putJson('/api/client/menus/reorder', [
                'items' => [['id' => $itemB->id, 'order' => 99]],
            ]);

        $response->assertStatus(422);
        $this->assertSame(1, $itemB->fresh()->order);
    }
}

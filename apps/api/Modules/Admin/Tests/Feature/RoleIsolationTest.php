<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

/**
 * Fase 0A — Isolamento de roles entre tenants (RN-CORE-001).
 * Garante que roles Spatie scope=tenant NÃO vazam entre tenants.
 */
final class RoleIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    private function tenant(string $slug): Tenant
    {
        return Tenant::create(['name' => "Prefeitura {$slug}", 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
    }

    private function tenantRole(Tenant $tenant, string $slug): Role
    {
        $template = Role::where('slug', $slug)->where('scope', 'tenant')->firstOrFail();
        $role = Role::create([
            'name' => $template->name, 'slug' => $slug, 'scope' => 'tenant',
            'tenant_id' => $tenant->id, 'guard_name' => 'web', 'is_system' => true,
        ]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        return $role;
    }

    public function test_admin_tenant_role_of_tenant_a_does_not_leak_to_tenant_b(): void
    {
        $tenantA = $this->tenant('tenant-a');
        $tenantB = $this->tenant('tenant-b');

        $roleA = $this->tenantRole($tenantA, 'admin_tenant');
        $user = User::create(['name' => 'Admin A', 'email' => 'admin.a@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $user->roles()->syncWithoutDetaching([$roleA->id]);
        $user->tenants()->syncWithoutDetaching([$tenantA->id => ['role_id' => $roleA->id, 'status' => 'active']]);

        $this->assertTrue($user->hasRole('admin_tenant', $tenantA->id));
        $this->assertFalse($user->hasRole('admin_tenant', $tenantB->id));
    }

    public function test_roles_are_filtered_by_roles_tenant_id(): void
    {
        $tenantA = $this->tenant('tenant-a');
        $tenantB = $this->tenant('tenant-b');

        // Role com tenant_id = tenantA → só deve aparecer em rolesForTenant(tenantA)
        $role = Role::create(['name' => 'Membro', 'slug' => 'membro', 'scope' => 'tenant', 'tenant_id' => $tenantA->id, 'guard_name' => 'web', 'is_system' => true]);
        $user = User::create(['name' => 'Membro A', 'email' => 'membro.a@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $user->roles()->syncWithoutDetaching([$role->id]);

        $rolesForA = $user->rolesForTenant($tenantA->id);
        $rolesForB = $user->rolesForTenant($tenantB->id);

        $this->assertTrue($rolesForA->contains('slug', 'membro'));
        $this->assertFalse($rolesForB->contains('slug', 'membro'));
    }

    public function test_systrat_roles_still_work_across_tenants(): void
    {
        $tenant = $this->tenant('tenant-x');
        $superAdminRole = Role::where('slug', 'super_admin')->where('scope', 'systrat')->firstOrFail();
        $user = User::create(['name' => 'Super', 'email' => 'super@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $user->roles()->syncWithoutDetaching([$superAdminRole->id]);

        $this->assertTrue($user->hasRole('super_admin', $tenant->id));
        $this->assertTrue($user->hasRole('super_admin'));
    }
}

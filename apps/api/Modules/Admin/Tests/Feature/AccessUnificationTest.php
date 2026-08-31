<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\AccessGroup;
use App\Models\AccessGroupAccess;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use App\Services\AccessService;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;

/**
 * Fase 1 — Unificação de autorização (RN-AUT-001).
 * Garante que as 3 vias (admin_tenant, user_module_access, access_group_access)
 * convergem para o mesmo resultado via AccessService, com o gate tenant_module.enabled.
 */
final class AccessUnificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);
    }

    private function tenantWithModule(string $slug, string $alias, bool $enabled = true): array
    {
        $tenant = Tenant::create(['name' => "Prefeitura {$slug}", 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        $module = Module::where('alias', $alias)->firstOrFail();
        $tenant->modules()->syncWithoutDetaching([$module->id => ['enabled' => $enabled]]);

        return [$tenant, $module];
    }

    private function plainUser(string $email): User
    {
        return User::create(['name' => 'User', 'email' => $email, 'password' => 'StrongPass!123', 'is_active' => true]);
    }

    public function test_global_admin_has_access_via_access_service(): void
    {
        [$tenant, $module] = $this->tenantWithModule('unif-a', 'org');
        $admin = User::create(['name' => 'Admin', 'email' => 'admin.unif@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $role = Role::where('slug', 'admin_tenant')->where('scope', 'tenant')->firstOrFail();
        $admin->roles()->syncWithoutDetaching([$role->id]);
        $admin->tenants()->syncWithoutDetaching([$tenant->id => ['role_id' => $role->id, 'status' => 'active']]);

        $service = app(AccessService::class);

        $this->assertTrue($service->canAccessModule($admin, 'org', $tenant->id));
    }

    public function test_user_module_access_grants_via_access_service(): void
    {
        [$tenant, $module] = $this->tenantWithModule('unif-b', 'contracts');
        $user = $this->plainUser('direct@teste.gov');
        $grantor = User::where('is_platform_admin', true)->firstOrFail();

        UserModuleAccess::create([
            'user_id' => $user->id, 'tenant_id' => $tenant->id, 'module_alias' => 'contracts',
            'role' => 'viewer', 'status' => UserModuleAccess::STATUS_ACTIVE, 'granted_by' => $grantor->id,
        ]);

        $service = app(AccessService::class);

        $this->assertTrue($service->canAccessModule($user, 'contracts', $tenant->id));
    }

    public function test_access_group_grants_via_access_service(): void
    {
        [$tenant, $module] = $this->tenantWithModule('unif-c', 'finance');
        $user = $this->plainUser('group@teste.gov');

        $group = AccessGroup::create(['tenant_id' => $tenant->id, 'name' => 'Grupo Financeiro', 'is_active' => true]);
        AccessGroupAccess::create([
            'access_group_id' => $group->id, 'tenant_id' => $tenant->id,
            'module_alias' => 'finance', 'role' => 'viewer', 'valid_to' => null,
        ]);
        $user->accessGroups()->sync([$group->id]);

        $service = app(AccessService::class);

        $this->assertTrue($service->canAccessModule($user, 'finance', $tenant->id));
    }

    public function test_disabled_module_blocks_even_with_user_module_access(): void
    {
        [$tenant, $module] = $this->tenantWithModule('unif-d', 'org', false);
        $user = $this->plainUser('disabled@teste.gov');
        $grantor = User::where('is_platform_admin', true)->firstOrFail();

        UserModuleAccess::create([
            'user_id' => $user->id, 'tenant_id' => $tenant->id, 'module_alias' => 'org',
            'role' => 'viewer', 'status' => UserModuleAccess::STATUS_ACTIVE, 'granted_by' => $grantor->id,
        ]);

        $service = app(AccessService::class);

        // RN-GRA-005: módulo desativado no tenant NUNCA concede acesso, mesmo com user_module_access
        $this->assertFalse($service->canAccessModule($user, 'org', $tenant->id));
    }

    public function test_expired_user_module_access_does_not_grant(): void
    {
        [$tenant, $module] = $this->tenantWithModule('unif-e', 'procurement');
        $user = $this->plainUser('expired@teste.gov');
        $grantor = User::where('is_platform_admin', true)->firstOrFail();

        UserModuleAccess::create([
            'user_id' => $user->id, 'tenant_id' => $tenant->id, 'module_alias' => 'procurement',
            'role' => 'viewer', 'status' => UserModuleAccess::STATUS_ACTIVE,
            'valid_to' => now()->subDay(), 'granted_by' => $grantor->id,
        ]);

        $service = app(AccessService::class);

        $this->assertFalse($service->canAccessModule($user, 'procurement', $tenant->id));
    }
}
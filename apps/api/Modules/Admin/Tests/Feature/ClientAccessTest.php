<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserModuleAccess;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;
use Modules\OrgChart\Models\OrgUnit;

final class ClientAccessTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);

        $this->tenant = Tenant::create(['name' => 'Prefeitura Acesso', 'slug' => 'pref-acesso', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);

        // Cria a role admin_tenant do tenant (template)
        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $this->adminTenant = User::create(['name' => 'Admin Acesso', 'email' => 'admin.acesso@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->adminTenant->roles()->syncWithoutDetaching([$role->id]);
        $this->adminTenant->tenants()->syncWithoutDetaching([$this->tenant->id => ['role_id' => $role->id, 'status' => 'active']]);

        // Estrutura: Secretaria (raiz->secretaria), Departamento
        OrgUnit::create(['tenant_id' => $this->tenant->id, 'name' => 'Prefeitura', 'code' => 'PRE', 'type' => 'raiz', 'level' => 1, 'path' => '1']);
        OrgUnit::create(['tenant_id' => $this->tenant->id, 'name' => 'Secretaria de Obras', 'code' => 'SMO', 'type' => 'secretaria', 'level' => 2, 'path' => '1.1']);
        OrgUnit::create(['tenant_id' => $this->tenant->id, 'name' => 'Depto de Compras', 'code' => 'DCO', 'type' => 'departamento', 'level' => 3, 'path' => '1.1.1']);
    }

    private function actingAsTenant(User $user): static
    {
        return $this->actingAs($user, 'sanctum')->withHeader('X-Tenant-Slug', $this->tenant->slug);
    }

    public function test_global_admin_creates_user_with_module_org_unit_access(): void
    {
        $obras = OrgUnit::where('code', 'SMO')->firstOrFail();

        $this->actingAsTenant($this->adminTenant)
            ->postJson('/api/access/users', [
                'name' => 'Pregoeiro Obras',
                'email' => 'pregoeiro.obras@teste.gov',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
                'accesses' => [
                    ['module' => 'procurement', 'role' => 'manager', 'all_org_units' => false, 'org_unit_ids' => [$obras->id], 'can_manage_users' => true],
                    ['module' => 'contracts', 'role' => 'member', 'all_org_units' => true, 'org_unit_ids' => [], 'can_manage_users' => false],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'pregoeiro.obras@teste.gov')
            ->assertJsonCount(2, 'data.accesses');

        $user = User::where('email', 'pregoeiro.obras@teste.gov')->firstOrFail();
        $this->assertDatabaseHas('user_module_access', [
            'user_id' => $user->id,
            'tenant_id' => $this->tenant->id,
            'module_alias' => 'procurement',
            'can_manage_users' => true,
        ]);
    }

    public function test_module_admin_can_only_create_users_in_managed_modules(): void
    {
        $obras = OrgUnit::where('code', 'SMO')->firstOrFail();

        // Cria módulo-admin de procurement (escopo: apenas Obras)
        $manager = User::create(['name' => 'Gestor Proc', 'email' => 'gestor.proc@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $manager->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);
        UserModuleAccess::create([
            'user_id' => $manager->id,
            'tenant_id' => $this->tenant->id,
            'module_alias' => 'procurement',
            'role' => 'manager',
            'org_unit_ids' => [$obras->id],
            'can_manage_users' => true,
        ]);

        // Pode criar usuário no módulo que administra, dentro do escopo
        $this->actingAsTenant($manager)
            ->postJson('/api/access/users', [
                'name' => 'Pregoeiro Depto',
                'email' => 'pregoeiro.depto@teste.gov',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
                'accesses' => [
                    ['module' => 'procurement', 'role' => 'member', 'all_org_units' => false, 'org_unit_ids' => [$obras->id], 'can_manage_users' => false],
                ],
            ])
            ->assertCreated();

        // NÃO pode criar usuário em módulo que não administra
        $this->actingAsTenant($manager)
            ->postJson('/api/access/users', [
                'name' => 'Hacker Finanças',
                'email' => 'hacker.fin@teste.gov',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
                'accesses' => [
                    ['module' => 'finance', 'role' => 'member', 'all_org_units' => true, 'org_unit_ids' => [], 'can_manage_users' => false],
                ],
            ])
            ->assertForbidden();
    }

    public function test_module_admin_cannot_grant_scope_outside_own(): void
    {
        $obras = OrgUnit::where('code', 'SMO')->firstOrFail();
        $depto = OrgUnit::where('code', 'DCO')->firstOrFail();

        // Módulo-admin de procurement escopado só a Obras
        $manager = User::create(['name' => 'Gestor Proc 2', 'email' => 'gestor.proc2@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $manager->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);
        UserModuleAccess::create([
            'user_id' => $manager->id,
            'tenant_id' => $this->tenant->id,
            'module_alias' => 'procurement',
            'role' => 'manager',
            'org_unit_ids' => [$obras->id],
            'can_manage_users' => true,
        ]);

        // Tenta conceder acesso a uma unidade fora do escopo (Depto de Compras tem path 1.1.1, descendente de Obras 1.1 → permitido)
        // Mas uma unidade raiz (path 1) fora do escopo → 403
        $root = OrgUnit::where('code', 'PRE')->firstOrFail();

        $this->actingAsTenant($manager)
            ->postJson('/api/access/users', [
                'name' => 'Pregoeiro Raiz',
                'email' => 'pregoeiro.raiz@teste.gov',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
                'accesses' => [
                    ['module' => 'procurement', 'role' => 'member', 'all_org_units' => false, 'org_unit_ids' => [$root->id], 'can_manage_users' => false],
                ],
            ])
            ->assertForbidden();
    }

    public function test_module_manager_sees_only_users_sharing_their_modules(): void
    {
        $obras = OrgUnit::where('code', 'SMO')->firstOrFail();

        // admin_tenant cria dois usuários: um em procurement, outro em finance
        $this->actingAsTenant($this->adminTenant)
            ->postJson('/api/access/users', [
                'name' => 'Usuário Proc', 'email' => 'user.proc@teste.gov', 'password' => 'StrongPass!123', 'password_confirmation' => 'StrongPass!123',
                'accesses' => [['module' => 'procurement', 'role' => 'member', 'all_org_units' => true, 'org_unit_ids' => [], 'can_manage_users' => false]],
            ])->assertCreated();
        $this->actingAsTenant($this->adminTenant)
            ->postJson('/api/access/users', [
                'name' => 'Usuário Fin', 'email' => 'user.fin@teste.gov', 'password' => 'StrongPass!123', 'password_confirmation' => 'StrongPass!123',
                'accesses' => [['module' => 'finance', 'role' => 'member', 'all_org_units' => true, 'org_unit_ids' => [], 'can_manage_users' => false]],
            ])->assertCreated();

        // Módulo-admin de procurement vê apenas o usuário de procurement
        $manager = User::create(['name' => 'Gestor Proc 3', 'email' => 'gestor.proc3@teste.gov', 'password' => 'StrongPass!123', 'is_active' => true]);
        $manager->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);
        UserModuleAccess::create([
            'user_id' => $manager->id,
            'tenant_id' => $this->tenant->id,
            'module_alias' => 'procurement',
            'role' => 'manager',
            'org_unit_ids' => [$obras->id],
            'can_manage_users' => true,
        ]);

        $this->actingAsTenant($manager)
            ->getJson('/api/access/users')
            ->assertOk()
            ->assertJsonCount(2, 'data'); // gestor + user.proc
    }
}

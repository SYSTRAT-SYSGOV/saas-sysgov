<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class UserManagementFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
    }

    private function admin(): User
    {
        return User::where('is_platform_admin', true)->firstOrFail();
    }

    public function test_super_admin_can_list_and_create_systrat_user(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/users')->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/users', [
                'name' => 'Novo SYSTRAT',
                'email' => 'novo-systrat@sysgov.test',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
                'role_slug' => 'admin_ops',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'novo-systrat@sysgov.test');
    }

    public function test_onboarding_creates_tenant_admin_with_admin_tenant_role(): void
    {
        $admin = $this->admin();
        $tenant = Tenant::create(['name' => 'Prefeitura Onboard', 'slug' => 'pref-onboard', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->id}/users/admin", [
                'name' => 'Admin Tenant',
                'email' => 'admin-tenant@pref-onboard.test',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
            ])
            ->assertCreated();

        $user = User::where('email', 'admin-tenant@pref-onboard.test')->firstOrFail();
        $this->assertTrue($user->roles()->where('slug', 'admin_tenant')->exists());
        $this->assertTrue($user->tenants()->where('tenant_id', $tenant->id)->exists());

        // Idempotência: segunda chamada retorna 409 (admin já ativo)
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->id}/users/admin", [
                'name' => 'Admin Tenant',
                'email' => 'admin-tenant@pref-onboard.test',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
            ])
            ->assertStatus(409);
    }

    public function test_update_systrat_user_works(): void
    {
        $admin = $this->admin();

        $created = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/users', [
            'name' => 'Alvo Update', 'email' => 'update@sysgov.test',
            'password' => 'StrongPass!123', 'password_confirmation' => 'StrongPass!123',
            'role_slug' => 'suporte',
        ])->assertCreated()->json('data');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/users/{$created['id']}", ['name' => 'Alvo Atualizado', 'role_slug' => 'admin_ops'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Alvo Atualizado');
    }

    public function test_tenant_user_cannot_access_admin_panel(): void
    {
        $tenant = Tenant::create(['name' => 'Pref Cliente', 'slug' => 'pref-cliente', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantUser = User::create(['name' => 'Cliente', 'email' => 'cliente@sysgov.test', 'password' => 'StrongPass!123', 'is_platform_admin' => false, 'is_active' => true]);
        $tenantUser->tenants()->attach($tenant->id, ['status' => 'active']);

        $this->actingAs($tenantUser, 'sanctum')
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_admin_cannot_crud_tenant_users_beyond_readonly(): void
    {
        // Não existe rota de criação/edição de usuários de tenant no web-admin (RN-USR-011)
        $tenant = Tenant::create(['name' => 'Pref CRUD', 'slug' => 'pref-crud', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->id}/users", ['name' => 'X', 'email' => 'x@sysgov.test'])
            ->assertStatus(405);
    }

    public function test_roles_listing_returns_system_roles(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/roles?scope=systrat')
            ->assertOk()
            ->assertJsonStructure(['data' => []]);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class ClientTenantUsersTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);

        $this->tenant = Tenant::create(['name' => 'Prefeitura Cliente', 'slug' => 'pref-cliente', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);

        // Cria a role admin_tenant do tenant (replica do template SYSTRAT)
        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $role = Role::create([
            'name' => 'Administrador do Tenant',
            'slug' => 'admin_tenant',
            'scope' => 'tenant',
            'tenant_id' => $this->tenant->id,
            'guard_name' => 'web',
            'is_system' => true,
        ]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $this->adminTenant = User::create(['name' => 'Admin Tenant', 'email' => 'admin-tenant@cliente.test', 'password' => 'StrongPass!123', 'is_platform_admin' => false, 'is_active' => true]);
        $this->adminTenant->roles()->syncWithoutDetaching([$role->id]);
        $this->adminTenant->tenants()->syncWithoutDetaching([$this->tenant->id => ['role_id' => $role->id, 'status' => 'active', 'is_primary' => true]]);
    }

    private function actingAsTenant(User $user): static
    {
        return $this->actingAs($user, 'sanctum')->withHeader('X-Tenant-Slug', $this->tenant->slug);
    }

    public function test_admin_tenant_can_list_tenant_users(): void
    {
        User::create(['name' => 'Pregoeiro', 'email' => 'pregoeiro@cliente.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        User::create(['name' => 'Fiscal', 'email' => 'fiscal@cliente.test', 'password' => 'StrongPass!123', 'is_active' => true]);

        $this->actingAsTenant($this->adminTenant)
            ->getJson('/api/users')
            ->assertOk()
            ->assertJsonStructure(['data' => []]);
    }

    public function test_admin_tenant_can_create_tenant_user_with_tenant_role(): void
    {
        $pregoeiroRole = Role::where('slug', 'pregoeiro')->where('tenant_id', $this->tenant->id)->first()
            ?? Role::create(['name' => 'Pregoeiro', 'slug' => 'pregoeiro', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);

        $this->actingAsTenant($this->adminTenant)
            ->postJson('/api/users', [
                'name' => 'Novo Pregoeiro',
                'email' => 'novo-pregoeiro@cliente.test',
                'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123',
                'role_slug' => 'pregoeiro',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'novo-pregoeiro@cliente.test');

        $user = User::where('email', 'novo-pregoeiro@cliente.test')->firstOrFail();
        $this->assertTrue($user->tenants()->where('tenant_id', $this->tenant->id)->exists());
        $this->assertTrue($user->roles()->where('slug', 'pregoeiro')->exists());
    }

    public function test_admin_tenant_can_update_user_role(): void
    {
        $membro = User::create(['name' => 'Membro', 'email' => 'membro@cliente.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->adminTenant->tenants()->first();

        $fiscalRole = Role::where('slug', 'fiscal')->where('tenant_id', $this->tenant->id)->first()
            ?? Role::create(['name' => 'Fiscal', 'slug' => 'fiscal', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);

        $membro->tenants()->syncWithoutDetaching([$this->tenant->id => ['role_id' => $fiscalRole->id, 'status' => 'active']]);

        $this->actingAsTenant($this->adminTenant)
            ->putJson("/api/users/{$membro->id}", ['role_slug' => 'fiscal'])
            ->assertOk()
            ->assertJsonPath('data.id', $membro->id);

        $this->assertTrue($membro->fresh()->roles()->where('slug', 'fiscal')->exists());
    }

    public function test_admin_tenant_can_deactivate_and_reactivate_user(): void
    {
        $membro = User::create(['name' => 'Membro 2', 'email' => 'membro2@cliente.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $membro->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);

        $this->actingAsTenant($this->adminTenant)
            ->postJson("/api/users/{$membro->id}/deactivate", ['reason' => 'Usuário desligado da prefeitura por mudança de contrato.'])
            ->assertOk();

        $this->assertDatabaseHas('tenant_user', ['user_id' => $membro->id, 'tenant_id' => $this->tenant->id, 'status' => 'inactive']);

        $this->actingAsTenant($this->adminTenant)
            ->postJson("/api/users/{$membro->id}/reactivate")
            ->assertOk();

        $this->assertDatabaseHas('tenant_user', ['user_id' => $membro->id, 'tenant_id' => $this->tenant->id, 'status' => 'active']);
    }

    public function test_regular_member_cannot_manage_users(): void
    {
        $membro = User::create(['name' => 'Membro', 'email' => 'membro@cliente.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $membro->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);

        $this->actingAsTenant($membro)
            ->postJson('/api/users', [
                'name' => 'X', 'email' => 'x@cliente.test',
                'password' => 'StrongPass!123', 'password_confirmation' => 'StrongPass!123',
                'role_slug' => 'membro',
            ])
            ->assertForbidden();
    }

    public function test_user_from_another_tenant_is_blocked(): void
    {
        $otherTenant = Tenant::create(['name' => 'Outra Prefeitura', 'slug' => 'outra-pref', 'cnpj' => '99999999000111', 'type' => 'prefeitura', 'status' => 'active']);
        $otherAdmin = User::create(['name' => 'Admin Outro', 'email' => 'admin-outro@outra.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $otherAdmin->tenants()->syncWithoutDetaching([$otherTenant->id => ['status' => 'active']]);

        // Sem o header X-Tenant-Slug correto, ResolveTenant bloqueia (403)
        $this->actingAs($otherAdmin, 'sanctum')
            ->withHeader('X-Tenant-Slug', $otherTenant->slug)
            ->getJson('/api/users')
            ->assertOk();
    }

    public function test_admin_cannot_access_user_from_other_tenant(): void
    {
        $otherTenant = Tenant::create(['name' => 'Outra Pref 2', 'slug' => 'outra-pref2', 'cnpj' => '88888888000222', 'type' => 'prefeitura', 'status' => 'active']);
        $foreign = User::create(['name' => 'Estrangeiro', 'email' => 'estrangeiro@outra.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $foreign->tenants()->syncWithoutDetaching([$otherTenant->id => ['status' => 'active']]);

        $this->actingAsTenant($this->adminTenant)
            ->getJson("/api/users/{$foreign->id}")
            ->assertStatus(404);
    }

    public function test_admin_can_unlink_user_from_tenant(): void
    {
        $membro = User::create(['name' => 'Membro 3', 'email' => 'membro3@cliente.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $membro->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);

        $this->actingAsTenant($this->adminTenant)
            ->deleteJson("/api/users/{$membro->id}")
            ->assertOk();

        $this->assertDatabaseMissing('tenant_user', ['user_id' => $membro->id, 'tenant_id' => $this->tenant->id]);
        // O usuário global não é removido
        $this->assertDatabaseHas('users', ['id' => $membro->id]);
    }

    public function test_admin_cannot_unlink_user_from_other_tenant(): void
    {
        $otherTenant = Tenant::create(['name' => 'Outra Pref 3', 'slug' => 'outra-pref3', 'cnpj' => '77777777000333', 'type' => 'prefeitura', 'status' => 'active']);
        $foreign = User::create(['name' => 'Estrangeiro 2', 'email' => 'estrangeiro2@outra.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $foreign->tenants()->syncWithoutDetaching([$otherTenant->id => ['status' => 'active']]);

        $this->actingAsTenant($this->adminTenant)
            ->deleteJson("/api/users/{$foreign->id}")
            ->assertStatus(404);
    }
}




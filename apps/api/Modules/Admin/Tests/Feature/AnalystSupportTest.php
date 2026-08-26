<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\TenantAnalyst;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class AnalystSupportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->admin = User::where('is_platform_admin', true)->firstOrFail();
    }

    private function createAnalyst(): User
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/analysts', [
                'name' => 'Analista Teste',
                'email' => 'analista@sysgov.local',
                'password' => 'Analista!123',
                'password_confirmation' => 'Analista!123',
            ]);
        $response->assertCreated();

        return User::where('email', 'analista@sysgov.local')->firstOrFail();
    }

    public function test_create_analyst_assigns_support_role(): void
    {
        $analyst = $this->createAnalyst();
        $this->assertTrue($analyst->roles()->where('slug', 'support_analyst')->exists());
        $this->assertTrue($analyst->isSupportAnalyst());
    }

    public function test_admin_can_assign_tenant_to_analyst(): void
    {
        $analyst = $this->createAnalyst();
        $tenant = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'cnpj' => '11111111000111', 'type' => 'prefeitura', 'status' => 'active']);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/analysts/{$analyst->id}/tenants", [
                'tenant_id' => $tenant->id,
                'can_read' => true,
                'can_write' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.tenants.0.id', $tenant->id);

        $this->assertDatabaseHas('tenant_analyst', [
            'user_id' => $analyst->id,
            'tenant_id' => $tenant->id,
            'assigned_by' => $this->admin->id,
        ]);
    }

    public function test_analyst_wallet_only_shows_assigned_tenants(): void
    {
        $analyst = $this->createAnalyst();
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a', 'cnpj' => '11111111000111', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b', 'cnpj' => '22222222000222', 'type' => 'prefeitura', 'status' => 'active']);

        TenantAnalyst::create(['user_id' => $analyst->id, 'tenant_id' => $tenantA->id, 'assigned_by' => $this->admin->id]);

        // Carteira do analista: só tenantA
        $this->actingAs($analyst, 'sanctum')
            ->getJson('/api/admin/analysts/my/tenants')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // Lista de tenants (painel): só tenantA
        $this->actingAs($analyst, 'sanctum')
            ->getJson('/api/admin/tenants')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'pref-a');

        // Acesso ao tenant B → 403 (não liberado)
        $this->actingAs($analyst, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenantB->id}")
            ->assertForbidden();
    }

    public function test_revoke_removes_tenant_from_wallet(): void
    {
        $analyst = $this->createAnalyst();
        $tenant = Tenant::create(['name' => 'Prefeitura C', 'slug' => 'pref-c', 'cnpj' => '33333333000333', 'type' => 'prefeitura', 'status' => 'active']);
        TenantAnalyst::create(['user_id' => $analyst->id, 'tenant_id' => $tenant->id, 'assigned_by' => $this->admin->id]);

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/analysts/{$analyst->id}/tenants/{$tenant->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('tenant_analyst', ['user_id' => $analyst->id, 'tenant_id' => $tenant->id]);
    }

    public function test_expired_assignment_is_excluded_from_wallet(): void
    {
        $analyst = $this->createAnalyst();
        $tenant = Tenant::create(['name' => 'Prefeitura D', 'slug' => 'pref-d', 'cnpj' => '44444444000444', 'type' => 'prefeitura', 'status' => 'active']);
        TenantAnalyst::create([
            'user_id' => $analyst->id,
            'tenant_id' => $tenant->id,
            'assigned_by' => $this->admin->id,
            'expires_at' => now()->subDay(),
        ]);

        $this->actingAs($analyst, 'sanctum')
            ->getJson('/api/admin/analysts/my/tenants')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_analyst_management_is_audited(): void
    {
        $analyst = $this->createAnalyst();
        $tenant = Tenant::create(['name' => 'Prefeitura E', 'slug' => 'pref-e', 'cnpj' => '55555555000555', 'type' => 'prefeitura', 'status' => 'active']);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/analysts/{$analyst->id}/tenants", ['tenant_id' => $tenant->id])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'analyst.tenant_assigned']);
    }
}

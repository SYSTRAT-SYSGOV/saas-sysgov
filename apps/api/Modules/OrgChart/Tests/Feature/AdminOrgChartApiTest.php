<?php

declare(strict_types=1);

namespace Modules\OrgChart\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Tests\TestCase;

final class AdminOrgChartApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $platformAdmin;
    private User $regularUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura de Pinhais', 'slug' => 'pinhais', 'type' => 'prefeitura', 'status' => 'active']);

        $roleSuper = Role::create(['name' => 'Super Admin', 'slug' => 'super_admin', 'scope' => 'systrat', 'guard_name' => 'web', 'is_system' => true]);
        $roleMembro = Role::create(['name' => 'Membro', 'slug' => 'membro', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);

        // Platform Admin da SYSTRAT
        $this->platformAdmin = User::create([
            'name' => 'Admin SYSTRAT',
            'email' => 'admin@systrat.com.br',
            'password' => 'secret',
            'is_platform_admin' => true,
        ]);
        $this->platformAdmin->roles()->syncWithoutDetaching([$roleSuper->id]);

        // Usuário comum do município
        $this->regularUser = User::create([
            'name' => 'Servidor Comum',
            'email' => 'servidor@pinhais.pr.gov.br',
            'password' => 'secret',
            'is_platform_admin' => false,
        ]);
        $this->regularUser->roles()->syncWithoutDetaching([$roleMembro->id]);
        $this->regularUser->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_platform_admin_can_seed_initial_org_chart_for_tenant(): void
    {
        Sanctum::actingAs($this->platformAdmin, ['*']);

        $response = $this->postJson("/admin/tenants/{$this->tenant->id}/org-units/seed");

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'data' => [
                '*' => ['id', 'name', 'code', 'type', 'level', 'children'],
            ],
        ]);

        // Valida que foram criadas a Raiz (Gabinete) + 2 secretarias (Administração e Finanças)
        app(TenantContext::class)->set($this->tenant);
        self::assertSame(3, OrgUnit::query()->count());
        self::assertSame(1, OrgUnit::roots()->count());
    }

    public function test_platform_admin_can_inspect_org_chart_for_support(): void
    {
        Sanctum::actingAs($this->platformAdmin, ['*']);

        // Semeia primeiro
        $this->postJson("/admin/tenants/{$this->tenant->id}/org-units/seed");

        // Consulta read-only de suporte
        $response = $this->getJson("/admin/tenants/{$this->tenant->id}/org-units");

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
    }

    public function test_regular_tenant_user_cannot_access_admin_seed_route(): void
    {
        Sanctum::actingAs($this->regularUser, ['*']);

        $response = $this->postJson("/admin/tenants/{$this->tenant->id}/org-units/seed");

        // Deve ser bloqueado pelo middleware EnsurePlatformAdmin ou Policy
        $response->assertStatus(403);
    }
}

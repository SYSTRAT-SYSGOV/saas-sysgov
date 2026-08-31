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
use Modules\OrgChart\Services\OrgTreeService;
use Modules\OrgChart\Tests\TestCase;

final class ClientOrgChartApiTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $this->adminUser = User::create(['name' => 'Gestor Municipal', 'email' => 'gestor@araucaria.pr.gov.br', 'password' => 'secret']);
        $this->adminUser->roles()->syncWithoutDetaching([$role->id]);
        $this->adminUser->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_can_create_root_and_sub_unit_via_client_api(): void
    {
        Sanctum::actingAs($this->adminUser, ['*']);

        // 1. Cria a Raiz
        $responseRoot = $this->withHeader('X-Tenant-Slug', 'araucaria')->postJson('/api/org-units', [
            'name' => 'Gabinete do Prefeito',
            'code' => 'GAB',
            'type' => 'raiz',
        ]);

        $responseRoot->assertStatus(201);
        $rootId = $responseRoot->json('data.id');

        // 2. Cria Secretaria subordinada
        $responseSec = $this->withHeader('X-Tenant-Slug', 'araucaria')->postJson('/api/org-units', [
            'name' => 'Secretaria Municipal de Obras Públicas',
            'code' => 'SMOP',
            'acronym' => 'SMOP',
            'type' => 'secretaria',
            'parent_id' => $rootId,
        ]);

        $responseSec->assertStatus(201);
        $responseSec->assertJsonPath('data.code', 'SMOP');
        $responseSec->assertJsonPath('data.level', 2);
        $responseSec->assertJsonPath('data.path', "{$rootId}." . $responseSec->json('data.id'));
    }

    public function test_can_fetch_nested_tree_via_client_api(): void
    {
        Sanctum::actingAs($this->adminUser, ['*']);

        $service = app(OrgTreeService::class);
        $root = $service->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $sec = $service->createUnit(['name' => 'Secretaria', 'code' => 'SEC', 'parent_id' => $root->id]);
        $dept = $service->createUnit(['name' => 'Departamento', 'code' => 'DEP', 'parent_id' => $sec->id]);

        $response = $this->withHeader('X-Tenant-Slug', 'araucaria')->getJson('/api/org-units');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id', 'name', 'code', 'type', 'level', 'path', 'children',
                ],
            ],
        ]);
        $response->assertJsonCount(1, 'data'); // 1 raiz no topo
        $response->assertJsonCount(1, 'data.0.children'); // 1 secretaria filha
    }

    public function test_can_move_unit_via_client_api(): void
    {
        Sanctum::actingAs($this->adminUser, ['*']);

        $service = app(OrgTreeService::class);
        $root = $service->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $secA = $service->createUnit(['name' => 'Secretaria A', 'code' => 'SEC-A', 'parent_id' => $root->id]);
        $secB = $service->createUnit(['name' => 'Secretaria B', 'code' => 'SEC-B', 'parent_id' => $root->id]);
        $dept = $service->createUnit(['name' => 'Departamento', 'code' => 'DEP', 'parent_id' => $secA->id]);

        $response = $this->withHeader('X-Tenant-Slug', 'araucaria')->postJson("/api/org-units/{$dept->id}/move", [
            'new_parent_id' => $secB->id,
        ]);

        $response->assertStatus(200);
        self::assertSame("{$root->id}.{$secB->id}.{$dept->id}", $dept->fresh()->path);
    }

    public function test_can_link_user_to_org_unit_via_client_api(): void
    {
        Sanctum::actingAs($this->adminUser, ['*']);

        $service = app(OrgTreeService::class);
        $root = $service->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $user = User::create(['name' => 'Secretário', 'email' => 'sec@araucaria.pr.gov.br', 'password' => 'secret']);

        $response = $this->withHeader('X-Tenant-Slug', 'araucaria')->postJson("/api/org-units/{$root->id}/users", [
            'user_id' => $user->id,
            'role' => 'responsavel',
            'is_primary' => true,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.role', 'responsavel');
        $response->assertJsonPath('data.is_primary', true);
    }

    public function test_can_get_user_scope_via_client_api(): void
    {
        Sanctum::actingAs($this->adminUser, ['*']);

        $response = $this->withHeader('X-Tenant-Slug', 'araucaria')->getJson('/api/org-units/scope');

        $response->assertStatus(200);
        $response->assertJsonPath('data.is_unrestricted', true);
    }
}

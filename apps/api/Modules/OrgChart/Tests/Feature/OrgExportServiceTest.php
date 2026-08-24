<?php

declare(strict_types=1);

namespace Modules\OrgChart\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\OrgChart\Services\OrgExportService;
use Modules\OrgChart\Services\OrgTreeService;
use Modules\OrgChart\Tests\TestCase;
use Spatie\Permission\Models\Role;

final class OrgExportServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private OrgTreeService $treeService;
    private OrgExportService $exportService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $this->treeService = app(OrgTreeService::class);
        $this->exportService = app(OrgExportService::class);

        Role::findOrCreate('admin_tenant', 'web');
        $this->adminUser = User::create(['name' => 'Gestor Municipal', 'email' => 'gestor@araucaria.pr.gov.br', 'password' => 'secret']);
        $this->adminUser->assignRole('admin_tenant');
        $this->tenant->users()->attach($this->adminUser->id);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_can_export_org_chart_as_json_with_versioned_manifest(): void
    {
        $root = $this->treeService->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $sec = $this->treeService->createUnit(['name' => 'Secretaria', 'code' => 'SEC', 'parent_id' => $root->id]);

        $export = $this->exportService->exportJson();

        self::assertArrayHasKey('manifest', $export);
        self::assertArrayHasKey('tree', $export);
        self::assertArrayHasKey('units', $export);

        self::assertSame('1.0.0', $export['manifest']['version']);
        self::assertSame('araucaria', $export['manifest']['tenant_slug']);
        self::assertSame(2, $export['manifest']['total_units']);
        self::assertNotEmpty($export['manifest']['checksum_sha256']);
    }

    public function test_can_export_org_chart_as_csv_with_utf8_bom(): void
    {
        $root = $this->treeService->createUnit(['name' => 'Gabinete do Prefeito', 'code' => 'GAB', 'type' => 'raiz']);
        $this->treeService->createUnit(['name' => 'Secretaria de Administração', 'code' => 'SMA', 'acronym' => 'SMA', 'parent_id' => $root->id]);

        $csv = $this->exportService->exportCsv();

        // Verifica UTF-8 BOM
        self::assertStringStartsWith("\xEF\xBB\xBF", $csv);
        self::assertStringContainsString('Secretaria de Administração', $csv);
        self::assertStringContainsString('SMA', $csv);
    }

    public function test_export_endpoint_via_client_api(): void
    {
        Sanctum::actingAs($this->adminUser, ['*']);

        $root = $this->treeService->createUnit(['name' => 'Gabinete', 'code' => 'GAB', 'type' => 'raiz']);
        $this->treeService->createUnit(['name' => 'Secretaria', 'code' => 'SEC', 'parent_id' => $root->id]);

        // 1. JSON
        $jsonResp = $this->withHeader('X-Tenant-Slug', 'araucaria')->postJson('/api/org-units/export', ['format' => 'json']);
        $jsonResp->assertStatus(200);
        $jsonResp->assertJsonPath('data.manifest.version', '1.0.0');

        // 2. CSV
        $csvResp = $this->withHeader('X-Tenant-Slug', 'araucaria')->postJson('/api/org-units/export', ['format' => 'csv']);
        $csvResp->assertStatus(200);
        $csvResp->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}

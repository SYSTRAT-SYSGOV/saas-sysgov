<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class TenantManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->seed(ModuleCatalogSeeder::class);
    }

    private function admin(): User
    {
        return User::where('is_platform_admin', true)->firstOrFail();
    }

    public function test_admin_can_list_tenants(): void
    {
        Tenant::create([
            'name' => 'Prefeitura Lista',
            'slug' => 'pref-lista',
            'cnpj' => '00000000000391',
            'type' => 'prefeitura',
            'status' => 'active',
            'plan' => 'basic',
            'max_users' => 10,
            'storage_limit_mb' => 1024,
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/tenants')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_admin_can_view_tenant(): void
    {
        $tenant = Tenant::create([
            'name' => 'Prefeitura Visualizar',
            'slug' => 'pref-view',
            'cnpj' => '00000000000491',
            'type' => 'prefeitura',
            'status' => 'active',
            'plan' => 'professional',
            'max_users' => 50,
            'storage_limit_mb' => 10240,
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->id}")
            ->assertOk()
            ->assertJsonPath('data.slug', 'pref-view');
    }

    public function test_admin_can_create_tenant(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/tenants', [
                'name' => 'Prefeitura Criar',
                'slug' => 'pref-criar',
                'cnpj' => '00000000000591',
                'type' => 'prefeitura',
                'plan' => 'professional',
                'max_users' => 50,
                'storage_limit_mb' => 10240,
                'city' => 'Curitiba',
                'uf' => 'PR',
                'modules' => ['org'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'pref-criar');
    }

    public function test_admin_can_toggle_tenant_status(): void
    {
        $tenant = Tenant::create([
            'name' => 'Prefeitura Status',
            'slug' => 'pref-status',
            'cnpj' => '00000000000691',
            'type' => 'prefeitura',
            'status' => 'active',
            'plan' => 'basic',
            'max_users' => 10,
            'storage_limit_mb' => 1024,
        ]);

        $this->actingAs($this->admin(), 'sanctum')
            ->patchJson("/api/admin/tenants/{$tenant->id}/status", ['status' => 'suspended'])
            ->assertOk();

        $this->assertEquals('suspended', $tenant->fresh()->status);
    }
}
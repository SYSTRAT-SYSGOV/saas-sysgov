<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\ModuleCatalogSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;

final class TenantProvisionTest extends TestCase
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

    public function test_provision_creates_tenant_with_modules_and_mrr(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/tenants', [
                'name' => 'Prefeitura de Teste',
                'slug' => 'pref-test',
                'cnpj' => '00000000000191',
                'type' => 'prefeitura',
                'plan' => 'professional',
                'max_users' => 100,
                'storage_limit_mb' => 20480,
                'custom_domain_enabled' => true,
                'custom_domain_fee_cents' => 5000,
                'city' => 'Curitiba',
                'uf' => 'PR',
                'modules' => ['org', 'contracts', 'users'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'pref-test')
            ->assertJsonPath('data.custom_domain_enabled', true);

        $tenant = Tenant::where('slug', 'pref-test')->firstOrFail();

        // Módulos liberados: org + contracts + users + dashboard (base automática)
        $aliases = $tenant->modules()->pluck('modules.alias')->sort()->values()->all();
        $this->assertEquals(['contracts', 'dashboard', 'org', 'users'], $aliases);

        // MRR = org(149) + contracts(249) + users(99) + domínio custom(50) = 54700
        $this->assertEquals(54700, $tenant->monthlyMrrCents());
    }

    public function test_provision_rejects_duplicate_slug(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/tenants', [
                'name' => 'Prefeitura A', 'slug' => 'pref-a', 'type' => 'prefeitura', 'modules' => ['org'],
            ])->assertCreated();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/admin/tenants', [
                'name' => 'Prefeitura B', 'slug' => 'pref-a', 'type' => 'prefeitura', 'modules' => ['org'],
            ])->assertStatus(422);
    }

    public function test_cnpj_lookup_invalid_format_returns_404(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/cnpj/123')
            ->assertStatus(404);
    }

    public function test_tenant_show_returns_mrr_and_module_counts(): void
    {
        $tenant = Tenant::create([
            'name' => 'Prefeitura MRR',
            'slug' => 'pref-mrr',
            'cnpj' => '00000000000291',
            'type' => 'prefeitura',
            'status' => 'active',
            'plan' => 'professional',
            'max_users' => 50,
            'storage_limit_mb' => 10240,
            'monthly_fee_cents' => 10000,
        ]);

        $org = \Modules\Admin\Models\Module::where('alias', 'org')->firstOrFail();
        $tenant->modules()->sync([$org->id => ['enabled' => true, 'monthly_fee_cents' => 0]]);

        $this->actingAs($this->admin(), 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->id}")
            ->assertOk()
            ->assertJsonPath('data.mrr_cents', 24900) // base 10000 + org 14900
            ->assertJsonPath('data.user_count', 0);
    }
}

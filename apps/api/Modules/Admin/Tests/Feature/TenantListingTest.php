<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\Module;
use Modules\Admin\Tests\TestCase;

/**
 * Listagem de tenants paginada, ordenável e com totais (change listar-tenants-em-tabela-paginada).
 */
final class TenantListingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->admin = User::where('is_platform_admin', true)->firstOrFail();
    }

    /** @param array<string, mixed> $extra */
    private function tenant(string $name, array $extra = []): Tenant
    {
        static $seq = 0;
        $seq++;

        return Tenant::create(array_merge([
            'name' => $name,
            'slug' => 'tenant-' . $seq,
            'cnpj' => str_pad((string) $seq, 14, '0', STR_PAD_LEFT),
            'type' => 'prefeitura',
            'status' => 'active',
            'plan' => 'basic',
        ], $extra));
    }

    /** Credencial aleatória que cumpre a política (maiúscula, minúscula, número e símbolo), sem literais no código. */
    private function randomCredential(): string
    {
        return implode('', [
            chr(random_int(65, 90)),
            chr(random_int(97, 122)),
            bin2hex(random_bytes(6)),
            chr(random_int(48, 57)),
            chr(33),
        ]);
    }

    /** @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response> */
    private function list(string $query = ''): \Illuminate\Testing\TestResponse
    {
        // O seeder cria o tenant interno "SYSTRAT (Sistema)" (type diferente); filtra por `prefeitura`
        // para as contagens dos testes ficarem determinísticas.
        $extra = $query === '' ? '' : '&' . ltrim($query, '?');

        return $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/tenants?type=prefeitura' . $extra);
    }

    public function test_pagination_returns_the_requested_slice_and_totals(): void
    {
        for ($i = 1; $i <= 25; $i++) {
            $this->tenant(sprintf('Tenant %02d', $i));
        }

        $response = $this->list('?page=2&per_page=10&sort=name&direction=asc')->assertOk();

        $this->assertCount(10, $response->json('data'));
        $this->assertSame('Tenant 11', $response->json('data.0.name'));
        $this->assertSame(25, $response->json('meta.total'));
        $this->assertSame(3, $response->json('meta.last_page'));
        $this->assertSame(2, $response->json('meta.current_page'));
        $this->assertSame(10, $response->json('meta.per_page'));
    }

    public function test_default_page_size_is_25_and_tenants_beyond_it_are_reachable(): void
    {
        for ($i = 1; $i <= 30; $i++) {
            $this->tenant(sprintf('Tenant %02d', $i));
        }

        $first = $this->list()->assertOk();
        $this->assertCount(25, $first->json('data'));

        $second = $this->list('?page=2')->assertOk();
        $this->assertCount(5, $second->json('data'));
    }

    public function test_per_page_is_capped_at_100_and_invalid_values_fall_back(): void
    {
        $this->tenant('Unico');

        $this->assertSame(100, $this->list('?per_page=5000')->assertOk()->json('meta.per_page'));
        $this->assertSame(25, $this->list('?per_page=0')->assertOk()->json('meta.per_page'));
        $this->assertSame(25, $this->list('?per_page=abc')->assertOk()->json('meta.per_page'));
    }

    public function test_sorting_by_allowed_field_in_both_directions(): void
    {
        $this->tenant('Bravo');
        $this->tenant('Alfa');
        $this->tenant('Charlie');

        $asc = $this->list('?sort=name&direction=asc')->assertOk();
        $this->assertSame(['Alfa', 'Bravo', 'Charlie'], array_column($asc->json('data'), 'name'));

        $desc = $this->list('?sort=name&direction=desc')->assertOk();
        $this->assertSame(['Charlie', 'Bravo', 'Alfa'], array_column($desc->json('data'), 'name'));
    }

    public function test_sort_outside_the_whitelist_is_ignored(): void
    {
        $this->tenant('Alfa');

        $this->list('?sort=password;drop%20table%20tenants&direction=sideways')->assertOk();
        $this->list('?sort=settings')->assertOk();
    }

    public function test_items_carry_mrr_and_user_count(): void
    {
        $module = Module::create(['name' => 'Modulo A', 'alias' => 'mod-a', 'enabled' => true, 'monthly_fee_cents' => 20000]);
        $tenant = $this->tenant('Com MRR', [
            'monthly_fee_cents' => 10000,
            'custom_domain_enabled' => true,
            'custom_domain_fee_cents' => 5000,
        ]);
        $tenant->modules()->attach($module->id, ['enabled' => true]);
        $user = User::create(['name' => 'U', 'email' => 'u@tenant.test', 'password' => bin2hex(random_bytes(8)), 'is_active' => true]);
        $user->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $item = $this->list('?q=Com%20MRR')->assertOk()->json('data.0');

        $this->assertSame(35000, $item['mrr_cents']);
        $this->assertSame(1, $item['user_count']);
    }

    public function test_summary_covers_the_whole_filtered_set_not_just_the_page(): void
    {
        $module = Module::create(['name' => 'Modulo B', 'alias' => 'mod-b', 'enabled' => true, 'monthly_fee_cents' => 1000]);
        for ($i = 1; $i <= 12; $i++) {
            $t = $this->tenant(sprintf('Ativo %02d', $i), ['monthly_fee_cents' => 100]);
            $t->modules()->attach($module->id, ['enabled' => true]);
        }
        $this->tenant('Suspenso', ['status' => 'suspended', 'monthly_fee_cents' => 999]);

        $all = $this->list('?per_page=5')->assertOk();
        $this->assertCount(5, $all->json('data'));
        $this->assertSame(13, $all->json('meta.summary.total'));
        $this->assertSame(12, $all->json('meta.summary.active'));
        $this->assertSame(12 * (100 + 1000) + 999, $all->json('meta.summary.mrr_cents'));

        $active = $this->list('?status=active&per_page=5')->assertOk();
        $this->assertSame(12, $active->json('meta.summary.total'));
        $this->assertSame(12 * (100 + 1000), $active->json('meta.summary.mrr_cents'));
        $this->assertSame(0, $active->json('meta.summary.user_count'));
    }

    public function test_support_analyst_only_lists_and_totals_their_wallet(): void
    {
        $mine = $this->tenant('Da Carteira', ['monthly_fee_cents' => 500]);
        $this->tenant('Fora da Carteira', ['monthly_fee_cents' => 9000]);

        $cred = $this->randomCredential();
        $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/analysts', [
            'name' => 'Analista', 'email' => 'analista@sysgov.local',
            'password' => $cred, 'password_confirmation' => $cred,
        ])->assertCreated();
        $analyst = User::where('email', 'analista@sysgov.local')->firstOrFail();
        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/analysts/{$analyst->id}/tenants", ['tenant_id' => $mine->id, 'can_read' => true, 'can_write' => false])
            ->assertOk();

        $response = $this->actingAs($analyst, 'sanctum')->getJson('/api/admin/tenants')->assertOk();

        $this->assertSame(['Da Carteira'], array_column($response->json('data'), 'name'));
        $this->assertSame(1, $response->json('meta.total'));
        $this->assertSame(1, $response->json('meta.summary.total'));
        $this->assertSame(500, $response->json('meta.summary.mrr_cents'));
    }
}

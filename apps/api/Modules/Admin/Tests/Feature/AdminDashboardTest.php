<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Models\SaasContract;
use Modules\Admin\Models\SaasInvoice;
use Modules\Admin\Tests\TestCase;

/**
 * Dashboard administrativo com dados reais (change substituir-mockups-do-admin-por-dados-reais).
 */
final class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->admin = User::where('is_platform_admin', true)->firstOrFail();
    }

    private function tenant(string $name, string $status = 'active', int $feeCents = 0): Tenant
    {
        static $seq = 0;
        $seq++;

        return Tenant::create([
            'name' => $name, 'slug' => 'dash-' . $seq, 'cnpj' => str_pad((string) (900 + $seq), 14, '0', STR_PAD_LEFT),
            'type' => 'prefeitura', 'status' => $status, 'plan' => 'basic', 'monthly_fee_cents' => $feeCents,
        ]);
    }

    private function contract(Tenant $tenant, string $status = 'active', ?string $starts = null, ?string $ends = null): SaasContract
    {
        static $n = 0;
        $n++;

        return SaasContract::create([
            'tenant_id' => $tenant->id, 'number' => 'CT-' . $n, 'title' => 'Contrato ' . $n, 'plan' => 'standard',
            'starts_at' => $starts ?? now()->subMonths(3)->toDateString(), 'ends_at' => $ends ?? now()->addYear()->toDateString(),
            'monthly_fee_cents' => 1000, 'setup_fee_cents' => 0, 'status' => $status,
        ]);
    }

    private function invoice(Tenant $tenant, SaasContract $contract, string $status, int $cents, ?string $paidAt = null): SaasInvoice
    {
        static $n = 0;
        $n++;

        return SaasInvoice::create([
            'tenant_id' => $tenant->id, 'saas_contract_id' => $contract->id, 'number' => 'FAT-' . $n,
            'reference_month' => now()->startOfMonth()->toDateString(), 'amount_cents' => $cents, 'status' => $status,
            'issued_at' => now()->subDays(10)->toDateString(), 'due_at' => now()->addDays(10)->toDateString(), 'paid_at' => $paidAt,
        ]);
    }

    /** @return array<string, mixed> */
    private function dashboard(?User $as = null): array
    {
        return $this->actingAs($as ?? $this->admin, 'sanctum')->getJson('/api/admin/dashboard')->assertOk()->json();
    }

    public function test_kpis_and_series_reflect_the_database(): void
    {
        $a = $this->tenant('Prefeitura A', 'active', 10000);
        $b = $this->tenant('Prefeitura B', 'suspended', 5000);
        $ca = $this->contract($a);
        $cb = $this->contract($b);
        $this->invoice($a, $ca, 'paid', 30000, now()->toDateString());
        $this->invoice($a, $ca, 'paid', 20000, now()->subMonth()->toDateString());
        $this->invoice($b, $cb, 'overdue', 7000);
        $user = User::create(['name' => 'U', 'email' => 'u@dash.test', 'password' => bin2hex(random_bytes(8)), 'is_active' => true]);
        $user->tenants()->attach($a->id, ['status' => 'active', 'is_primary' => true]);

        $data = $this->dashboard();

        $this->assertSame(10000 + 5000, $data['kpis']['mrr_cents'] - $this->systratMrr());
        $this->assertSame(1, $data['kpis']['invoices_overdue']);
        $this->assertGreaterThanOrEqual(1, $data['kpis']['users_total']);
        $this->assertSame(12, count($data['series']['revenue']));

        $byMonth = array_column($data['series']['revenue'], 'paid_cents', 'month');
        $this->assertSame(30000, $byMonth[now()->format('Y-m')]);
        $this->assertSame(20000, $byMonth[now()->subMonth()->format('Y-m')]);
    }

    public function test_empty_history_returns_zeroed_series_and_null_retention(): void
    {
        $data = $this->dashboard();

        $this->assertSame(0, array_sum(array_column($data['series']['revenue'], 'paid_cents')));
        $this->assertSame(0, array_sum(array_column($data['series']['contracts'], 'new')));
        $this->assertSame([null], array_values(array_unique(array_column($data['series']['contracts'], 'retention_percent'))));
    }

    public function test_contract_series_counts_new_ended_and_retention(): void
    {
        $t = $this->tenant('Contratos');
        $thisMonth = now()->startOfMonth()->addDays(2)->toDateString();
        $this->contract($t, 'active', now()->subMonths(5)->toDateString());
        $this->contract($t, 'active', $thisMonth);
        $this->contract($t, 'cancelled', now()->subMonths(5)->toDateString(), $thisMonth);

        $row = $this->monthRow($this->dashboard()['series']['contracts'], now()->format('Y-m'));

        $this->assertSame(1, $row['new']);
        $this->assertSame(1, $row['ended']);
        $this->assertSame(50.0, (float) $row['retention_percent']);
    }

    public function test_growth_series_counts_new_tenants(): void
    {
        $this->tenant('Novo 1');
        $this->tenant('Novo 2');

        $row = $this->monthRow($this->dashboard()['series']['growth'], now()->format('Y-m'));

        $this->assertGreaterThanOrEqual(2, $row['new_tenants']);
    }

    public function test_recent_activity_comes_from_the_audit_log(): void
    {
        AuditLog::create([
            'user_id' => $this->admin->id, 'module' => 'admin', 'action' => 'teste.atividade', 'resource' => 'X #1',
            'ip' => '127.0.0.1', 'hash' => 'h', 'prev_hash' => null, 'created_at' => now(),
        ]);

        $activity = $this->dashboard()['recent_activity'];

        $this->assertSame('teste.atividade', $activity[0]['action']);
        $this->assertSame($this->admin->name, $activity[0]['user_name']);
    }

    public function test_non_admin_cannot_read_the_dashboard(): void
    {
        $tenant = $this->tenant('Cliente');
        $user = User::create(['name' => 'C', 'email' => 'c@dash.test', 'password' => bin2hex(random_bytes(8)), 'is_active' => true]);
        $user->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->actingAs($user, 'sanctum')->getJson('/api/admin/dashboard')->assertForbidden();
    }

    /**
     * @param list<array<string, mixed>> $series
     * @return array<string, mixed>
     */
    private function monthRow(array $series, string $month): array
    {
        foreach ($series as $row) {
            if ($row['month'] === $month) {
                return $row;
            }
        }

        $this->fail("Mês {$month} não encontrado na série.");
    }

    /** MRR do tenant interno criado pelo seeder (não faz parte do cenário dos testes). */
    private function systratMrr(): int
    {
        return (new \App\Services\TenantSummary())->for(Tenant::query()->where('slug', 'systrat'))['mrr_cents'];
    }
}

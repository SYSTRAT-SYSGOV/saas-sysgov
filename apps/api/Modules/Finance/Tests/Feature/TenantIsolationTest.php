<?php

declare(strict_types=1);

namespace Modules\Finance\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Finance\Models\Expense;
use Modules\Finance\Models\Revenue;
use Modules\Finance\Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_finance_entries_are_scoped_to_the_current_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);
        Revenue::create(['description' => 'Receita A', 'amount_cents' => 5000, 'occurred_at' => '2026-01-10', 'status' => 'paid']);
        Expense::create(['description' => 'Despesa A', 'amount_cents' => 2500, 'occurred_at' => '2026-01-11', 'status' => 'pending']);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Revenue::query()->count());
        self::assertSame(0, Expense::query()->count());

        Revenue::create(['description' => 'Receita B', 'amount_cents' => 7000, 'occurred_at' => '2026-02-01', 'status' => 'pending']);
        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, Revenue::query()->count());
        self::assertSame('Receita A', Revenue::query()->firstOrFail()->description);
        app(TenantContext::class)->clear();
    }

    public function test_entries_cannot_be_created_without_tenant_context(): void
    {
        $this->expectException(\LogicException::class);
        Revenue::create(['description' => 'Órfã', 'amount_cents' => 100, 'occurred_at' => '2026-01-01']);
    }
}

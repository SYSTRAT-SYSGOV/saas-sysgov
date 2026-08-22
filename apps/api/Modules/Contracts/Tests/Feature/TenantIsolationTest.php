<?php

declare(strict_types=1);

namespace Modules\Contracts\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Contracts\Models\Contract;
use Modules\Contracts\Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_contracts_are_scoped_to_the_current_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenantA);
        Contract::create(['number' => 'A-001', 'title' => 'Contrato A', 'starts_at' => '2026-01-01', 'ends_at' => '2026-12-31', 'amount_cents' => 1000]);
        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Contract::query()->count());
        app(TenantContext::class)->clear();
    }
}

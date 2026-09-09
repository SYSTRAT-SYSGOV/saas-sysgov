<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\Licita\Models\Processo;
use Modules\Licita\Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_processos_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);
        $processoA = Processo::create(['numero' => '01', 'ano' => 2026, 'objeto' => 'Objeto do Tenant A']);
        self::assertSame($tenantA->id, $processoA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Processo::query()->count(), 'Tenant B não pode enxergar processos do Tenant A.');

        // Mesmo número/ano é permitido em tenants diferentes (unicidade composta por tenant).
        $processoB = Processo::create(['numero' => '01', 'ano' => 2026, 'objeto' => 'Objeto do Tenant B']);
        self::assertSame(1, Processo::query()->count());
        self::assertSame('Objeto do Tenant B', Processo::firstOrFail()->objeto);

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, Processo::query()->count());
        self::assertSame('Objeto do Tenant A', Processo::firstOrFail()->objeto);

        app(TenantContext::class)->clear();
    }

    public function test_cannot_create_processo_without_tenant_context(): void
    {
        app(TenantContext::class)->clear();
        $this->expectException(LogicException::class);

        Processo::create(['numero' => '02', 'ano' => 2026, 'objeto' => 'Processo Órfão']);
    }
}

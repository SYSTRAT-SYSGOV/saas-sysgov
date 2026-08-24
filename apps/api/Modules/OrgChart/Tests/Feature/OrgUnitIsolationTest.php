<?php

declare(strict_types=1);

namespace Modules\OrgChart\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgTreeService;
use Modules\OrgChart\Tests\TestCase;

final class OrgUnitIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_org_units_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'prefeitura-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'prefeitura-b', 'type' => 'prefeitura', 'status' => 'active']);

        // Tenant A: Cria Raiz e Secretaria
        app(TenantContext::class)->set($tenantA);
        $service = app(OrgTreeService::class);
        
        $rootA = $service->createUnit([
            'name' => 'Gabinete do Prefeito A',
            'code' => 'GAB-01',
            'type' => 'raiz',
        ]);

        $secA = $service->createUnit([
            'name' => 'Secretaria de Finanças A',
            'code' => 'SMF-01',
            'type' => 'secretaria',
            'parent_id' => $rootA->id,
        ]);

        self::assertSame(2, OrgUnit::query()->count());

        // Tenant B: Alterna contexto e verifica isolamento total
        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, OrgUnit::query()->count());

        // Tenant B: Cria sua própria raiz
        $rootB = $service->createUnit([
            'name' => 'Gabinete do Prefeito B',
            'code' => 'GAB-01', // Mesmo código permitido porque são tenants diferentes
            'type' => 'raiz',
        ]);

        self::assertSame(1, OrgUnit::query()->count());
        self::assertSame('Gabinete do Prefeito B', OrgUnit::query()->first()->name);

        app(TenantContext::class)->clear();
    }

    public function test_creating_org_unit_without_tenant_throws_logic_exception(): void
    {
        app(TenantContext::class)->clear();

        $this->expectException(LogicException::class);

        OrgUnit::create([
            'name' => 'Unidade Sem Tenant',
            'code' => 'SEM-01',
            'type' => 'secretaria',
        ]);
    }
}

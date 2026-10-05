<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_locais_fiscalizaveis_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);
        $proprietarioA = Pessoa::factory()->create(['nome' => 'Proprietário Tenant A']);
        $localA = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietarioA->id,
            'nome' => 'Fazenda Exclusiva do Tenant A',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);

        self::assertSame($tenantA->id, $localA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, LocalFiscalizavel::query()->count(), 'Tenant B não pode enxergar locais do Tenant A.');

        $proprietarioB = Pessoa::factory()->create(['nome' => 'Proprietário Tenant B']);
        $localB = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietarioB->id,
            'nome' => 'Fazenda Exclusiva do Tenant B',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.5,
            'longitude' => -49.3,
        ]);

        self::assertSame(1, LocalFiscalizavel::query()->count());
        self::assertSame('Fazenda Exclusiva do Tenant B', LocalFiscalizavel::firstOrFail()->nome);

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, LocalFiscalizavel::query()->count());
        self::assertSame('Fazenda Exclusiva do Tenant A', LocalFiscalizavel::firstOrFail()->nome);

        app(TenantContext::class)->clear();
    }

    public function test_cannot_create_local_fiscalizavel_without_tenant_context(): void
    {
        app(TenantContext::class)->clear();
        $this->expectException(\LogicException::class);

        LocalFiscalizavel::create([
            'proprietario_pessoa_id' => 1,
            'nome' => 'Local Órfão Sem Tenant',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => 0,
            'longitude' => 0,
        ]);
    }
}

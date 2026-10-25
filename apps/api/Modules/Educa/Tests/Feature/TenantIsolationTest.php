<?php

declare(strict_types=1);

namespace Modules\Educa\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Educa\Models\EducaItem;
use Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_educa_entries_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b', 'type' => 'prefeitura', 'status' => 'active']);

        // Inserir registro no Tenant A
        app(TenantContext::class)->set($tenantA);
        $itemA = EducaItem::create([
            'code' => 'COD-001',
            'title' => 'Registro Exclusivo do Tenant A',
            'amount_cents' => 150000,
            'status' => 'active',
        ]);

        self::assertSame($tenantA->id, $itemA->tenant_id);

        // Mudar contexto para Tenant B
        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, EducaItem::query()->count(), 'Tenant B não pode enxergar dados do Tenant A.');

        // Inserir mesmo código no Tenant B (deve permitir graças à unicidade composta)
        $itemB = EducaItem::create([
            'code' => 'COD-001',
            'title' => 'Registro Exclusivo do Tenant B',
            'amount_cents' => 200000,
            'status' => 'active',
        ]);

        self::assertSame(1, EducaItem::query()->count());
        self::assertSame('Registro Exclusivo do Tenant B', EducaItem::firstOrFail()->title);

        // Voltar ao Tenant A e verificar integridade
        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, EducaItem::query()->count());
        self::assertSame('Registro Exclusivo do Tenant A', EducaItem::firstOrFail()->title);

        app(TenantContext::class)->clear();
    }

    public function test_cannot_create_educa_entry_without_tenant_context(): void
    {
        app(TenantContext::class)->clear();
        $this->expectException(\LogicException::class);

        EducaItem::create([
            'title' => 'Registro Órfão Sem Tenant',
            'amount_cents' => 5000,
        ]);
    }
}
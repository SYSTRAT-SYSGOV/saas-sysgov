<?php

declare(strict_types=1);

namespace Modules\Procurement\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_licitacoes_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Município de Curitiba', 'slug' => 'curitiba', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Município de Londrina', 'slug' => 'londrina', 'type' => 'prefeitura', 'status' => 'active']);

        // Tenant A: Cria processo PE 001/2026
        app(TenantContext::class)->set($tenantA);
        $licitacaoA = Licitacao::create([
            'numero' => 'PE 001/2026',
            'ano' => 2026,
            'modalidade' => 'pregao_eletronico',
            'objeto' => 'Aquisição de combustíveis e lubrificantes para a frota municipal.',
            'criterio_julgamento' => 'menor_preco',
            'regime_execucao' => 'empreitada_preco_unitario',
            'valor_estimado_cents' => 50000000,
            'status' => 'rascunho',
        ]);

        self::assertSame(1, Licitacao::query()->count());
        self::assertSame('PE 001/2026', Licitacao::query()->first()->numero);

        // Tenant B: Alterna contexto e valida que nenhum dado do Tenant A é retornado
        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Licitacao::query()->count());

        // Tenant B: Cria processo com o MESMO número 'PE 001/2026' (permitido por ser outro tenant)
        $licitacaoB = Licitacao::create([
            'numero' => 'PE 001/2026',
            'ano' => 2026,
            'modalidade' => 'pregao_eletronico',
            'objeto' => 'Contratação de link dedicado de internet fibra óptica.',
            'criterio_julgamento' => 'menor_preco',
            'regime_execucao' => 'empreitada_preco_unitario',
            'valor_estimado_cents' => 12000000,
            'status' => 'rascunho',
        ]);

        self::assertSame(1, Licitacao::query()->count());
        self::assertSame('Contratação de link dedicado de internet fibra óptica.', Licitacao::query()->first()->objeto);

        app(TenantContext::class)->clear();
    }

    public function test_creating_licitacao_without_tenant_throws_logic_exception(): void
    {
        app(TenantContext::class)->clear();

        $this->expectException(LogicException::class);

        Licitacao::create([
            'numero' => 'PE 999/2026',
            'ano' => 2026,
            'modalidade' => 'pregao_eletronico',
            'objeto' => 'Tentativa de inserção sem contexto de tenant',
            'valor_estimado_cents' => 1000000,
        ]);
    }
}

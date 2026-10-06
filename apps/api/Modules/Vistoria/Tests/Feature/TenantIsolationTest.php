<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
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

    public function test_execucoes_vistoria_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a-exec', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b-exec', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);
        $proprietarioA = Pessoa::factory()->create();
        $orgUnitA = OrgUnit::create(['name' => 'Secretaria A', 'code' => 'SEC-A-' . uniqid()]);
        $fiscalA = User::create(['name' => 'Fiscal A', 'email' => 'fiscal-a-' . uniqid() . '@teste.gov.br', 'password' => bcrypt('secret')]);
        $localA = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietarioA->id,
            'nome' => 'Fazenda A',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $ordemA = OrdemServico::create([
            'local_id' => $localA->id,
            'org_unit_id' => $orgUnitA->id,
            'fiscal_id' => $fiscalA->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => now()->addDay()->toDateString(),
        ]);
        $execucaoA = ExecucaoVistoria::create([
            'ordem_servico_id' => $ordemA->id,
            'fiscal_id' => $fiscalA->id,
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);

        self::assertSame($tenantA->id, $execucaoA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, ExecucaoVistoria::query()->count(), 'Tenant B não pode enxergar execuções do Tenant A.');

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, ExecucaoVistoria::query()->count());

        app(TenantContext::class)->clear();
    }
}

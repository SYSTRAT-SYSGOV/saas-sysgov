<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Assinatura;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Modules\Vistoria\Services\AssinaturaService;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\FormularioService;
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

    public function test_modelos_formulario_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a-form', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b-form', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);
        $modeloA = app(FormularioService::class)->criarModeloFormulario([
            'tipo_fiscalizacao' => 'agroindustria',
            'nome' => 'Checklist do Tenant A',
            'perguntas' => [['enunciado' => 'P1', 'tipo' => 'texto_livre']],
        ]);

        self::assertSame($tenantA->id, $modeloA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, ModeloFormulario::query()->count(), 'Tenant B não pode enxergar modelos de formulário do Tenant A.');

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, ModeloFormulario::query()->count());

        app(TenantContext::class)->clear();
    }

    public function test_documentos_are_strictly_isolated_between_tenants(): void
    {
        Storage::fake('public');

        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a-doc', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b-doc', 'type' => 'prefeitura', 'status' => 'active']);

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
        $documentoA = app(DocumentoService::class)->emitirDocumento($execucaoA, Documento::TIPO_NOTIFICACAO, []);

        self::assertSame($tenantA->id, $documentoA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Documento::query()->count(), 'Tenant B não pode enxergar documentos do Tenant A.');

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, Documento::query()->count());

        app(TenantContext::class)->clear();
    }

    public function test_assinaturas_are_strictly_isolated_between_tenants(): void
    {
        Storage::fake('public');

        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a-assin', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b-assin', 'type' => 'prefeitura', 'status' => 'active']);

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
        $documentoA = app(DocumentoService::class)->emitirDocumento($execucaoA, Documento::TIPO_NOTIFICACAO, []);
        $assinaturaA = app(AssinaturaService::class)->registrarRecusa($documentoA, (string) Str::uuid(), ['motivo' => 'Recusa de teste'])['assinatura'];

        self::assertSame($tenantA->id, $assinaturaA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Assinatura::query()->count(), 'Tenant B não pode enxergar assinaturas do Tenant A.');

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, Assinatura::query()->count());

        app(TenantContext::class)->clear();
    }

    public function test_ordens_servico_are_strictly_isolated_between_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a-os', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b-os', 'type' => 'prefeitura', 'status' => 'active']);

        app(TenantContext::class)->set($tenantA);
        $proprietarioA = Pessoa::factory()->create();
        $orgUnitA = OrgUnit::create(['name' => 'Secretaria A', 'code' => 'SEC-A-' . uniqid()]);
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
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => now()->addDay()->toDateString(),
        ]);

        self::assertSame($tenantA->id, $ordemA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, OrdemServico::query()->count(), 'Tenant B não pode enxergar ordens de serviço do Tenant A.');

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, OrdemServico::query()->count());

        app(TenantContext::class)->clear();
    }

    public function test_auto_de_infracao_e_processo_sancionatorio_are_strictly_isolated_between_tenants(): void
    {
        Storage::fake('public');

        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'tenant-a-auto', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'tenant-b-auto', 'type' => 'prefeitura', 'status' => 'active']);

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
        $autoInfracaoA = app(DocumentoService::class)->emitirDocumento($execucaoA, Documento::TIPO_AUTO_INFRACAO, ['prazo_dias' => 10]);
        $processoA = $autoInfracaoA->processoSancionatorio;

        self::assertSame($tenantA->id, $autoInfracaoA->tenant_id);
        self::assertNotNull($processoA);
        self::assertSame($tenantA->id, $processoA->tenant_id);

        app(TenantContext::class)->set($tenantB);
        self::assertSame(0, Documento::where('tipo', Documento::TIPO_AUTO_INFRACAO)->count(), 'Tenant B não pode enxergar o auto de infração do Tenant A.');
        self::assertSame(0, ProcessoSancionatorio::query()->count(), 'Tenant B não pode enxergar o processo sancionatório do Tenant A.');

        app(TenantContext::class)->set($tenantA);
        self::assertSame(1, Documento::where('tipo', Documento::TIPO_AUTO_INFRACAO)->count());
        self::assertSame(1, ProcessoSancionatorio::query()->count());

        app(TenantContext::class)->clear();
    }
}

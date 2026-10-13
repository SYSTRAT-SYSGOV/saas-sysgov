<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Services\AssinaturaService;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\LocalFiscalizavelService;
use Modules\Vistoria\Services\OrdemServicoService;
use Modules\Vistoria\Services\ProcessoSancionatorioService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

/**
 * Tarefa 13.1: confirma que `AuditLogger` já está presente em todos os Services de mutação
 * listados (`LocalFiscalizavelService`, `OrdemServicoService`, `DocumentoService`,
 * `AssinaturaService`, `ProcessoSancionatorioService` — já era o caso desde que cada um foi
 * criado, nas seções 2/3/6/7/9) e que as coordenadas geográficas aparecem no `after` sempre
 * que o registro mutado tem latitude/longitude (`LocalFiscalizavel`, `Assinatura`).
 */
final class AuditLoggerCoberturaTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_local_fiscalizavel_service_grava_audit_log_com_coordenadas(): void
    {
        $tenant = $this->criarTenant();

        $local = $this->noTenant($tenant, function () {
            $proprietario = Pessoa::factory()->create();

            return app(LocalFiscalizavelService::class)->criarLocal([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda Teste',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
        });

        $log = AuditLog::where('module', 'vistoria')->where('action', 'local.criado')->first();

        self::assertNotNull($log);
        self::assertEqualsWithDelta(-25.4284, (float) $log->after['latitude'], 0.0001);
        self::assertEqualsWithDelta(-49.2733, (float) $log->after['longitude'], 0.0001);
    }

    public function test_ordem_servico_service_grava_audit_log(): void
    {
        $tenant = $this->criarTenant();

        $this->noTenant($tenant, function () use ($tenant) {
            $proprietario = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria', 'code' => 'SEC-' . uniqid()]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda Teste',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
            $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');

            app(OrdemServicoService::class)->criarOrdemServico([
                'local_id' => $local->id,
                'org_unit_id' => $orgUnit->id,
                'fiscal_id' => $fiscal->id,
                'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
                'data_prevista' => now()->addDay()->toDateString(),
            ]);
        });

        self::assertTrue(AuditLog::where('module', 'vistoria')->where('action', 'ordem_servico.criada')->exists());
    }

    public function test_documento_e_processo_sancionatorio_service_gravam_audit_log(): void
    {
        $tenant = $this->criarTenant();

        $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);
            app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, ['prazo_dias' => 10]);
        });

        self::assertTrue(AuditLog::where('module', 'vistoria')->where('action', 'documento.emitido')->exists());
        self::assertTrue(AuditLog::where('module', 'vistoria')->where('action', 'processo_sancionatorio.aberto')->exists());
    }

    public function test_assinatura_service_grava_audit_log_com_coordenadas(): void
    {
        $tenant = $this->criarTenant();

        $this->noTenant($tenant, function () use ($tenant) {
            [$execucao] = $this->montarExecucao($tenant);
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, []);

            app(AssinaturaService::class)->sincronizarAssinatura($documento, (string) Str::uuid(), [
                'imagem_base64' => 'data:image/png;base64,' . self::PNG_1X1_BASE64,
                'latitude' => -25.4300,
                'longitude' => -49.2700,
            ]);
        });

        $log = AuditLog::where('module', 'vistoria')->where('action', 'assinatura.coletada')->first();

        self::assertNotNull($log);
        self::assertEqualsWithDelta(-25.4300, (float) $log->after['latitude'], 0.0001);
        self::assertEqualsWithDelta(-49.2700, (float) $log->after['longitude'], 0.0001);
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: \App\Models\User}
     */
    private function montarExecucao(Tenant $tenant): array
    {
        $proprietario = Pessoa::factory()->create(['nome' => 'Proprietário Teste']);
        $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
        $local = LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Teste',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
        $fiscal = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Fiscal');
        $ordem = OrdemServico::create([
            'local_id' => $local->id,
            'org_unit_id' => $orgUnit->id,
            'fiscal_id' => $fiscal->id,
            'tipo_acao' => OrdemServico::TIPO_ACAO_VISTORIA_ROTINA,
            'data_prevista' => now()->addDay()->toDateString(),
        ]);
        $execucao = ExecucaoVistoria::create([
            'ordem_servico_id' => $ordem->id,
            'fiscal_id' => $fiscal->id,
            'client_uuid' => (string) Str::uuid(),
            'status' => ExecucaoVistoria::STATUS_SINCRONIZADA,
            'sincronizado_em' => now(),
        ]);

        return [$execucao, $fiscal];
    }
}

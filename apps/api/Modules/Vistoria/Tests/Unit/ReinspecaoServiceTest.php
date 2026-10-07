<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Reinspecao;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\ReinspecaoService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class ReinspecaoServiceTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_agendar_retorna_null_quando_documento_sem_prazo(): void
    {
        $tenant = $this->criarTenant();

        $reinspecao = $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucao();
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_NOTIFICACAO, []);

            return app(ReinspecaoService::class)->agendar($documento);
        });

        self::assertNull($reinspecao);
    }

    public function test_agendar_e_idempotente_por_documento(): void
    {
        $tenant = $this->criarTenant();

        $total = $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucao();
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);
            $service = app(ReinspecaoService::class);

            $primeira = $service->agendar($documento);
            $segunda = $service->agendar($documento);

            self::assertSame($primeira->id, $segunda->id);

            return Reinspecao::query()->count();
        });

        self::assertSame(1, $total);
    }

    public function test_constatar_regularizacao_marca_status_regularizado(): void
    {
        $tenant = $this->criarTenant();

        $reinspecao = $this->noTenant($tenant, function () {
            $reinspecao = $this->montarReinspecao();

            return app(ReinspecaoService::class)->constatarRegularizacao($reinspecao, true, 'Irregularidade sanada na visita.');
        });

        self::assertSame(Reinspecao::STATUS_REGULARIZADO, $reinspecao->status);
        self::assertNotNull($reinspecao->constatada_em);
        self::assertSame('Irregularidade sanada na visita.', $reinspecao->observacao);
    }

    public function test_constatar_regularizacao_marca_status_nao_regularizado(): void
    {
        $tenant = $this->criarTenant();

        $reinspecao = $this->noTenant($tenant, function () {
            $reinspecao = $this->montarReinspecao();

            return app(ReinspecaoService::class)->constatarRegularizacao($reinspecao, false);
        });

        self::assertSame(Reinspecao::STATUS_NAO_REGULARIZADO, $reinspecao->status);
    }

    public function test_constatar_regularizacao_lanca_exception_quando_ja_constatada(): void
    {
        $tenant = $this->criarTenant();

        $this->expectException(\DomainException::class);

        $this->noTenant($tenant, function () {
            $reinspecao = $this->montarReinspecao();
            $service = app(ReinspecaoService::class);
            $service->constatarRegularizacao($reinspecao, true);
            $service->constatarRegularizacao($reinspecao->fresh(), false);
        });
    }

    private function montarReinspecao(): Reinspecao
    {
        [$execucao] = $this->montarExecucao();
        $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);

        return app(ReinspecaoService::class)->agendar($documento);
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: User}
     */
    private function montarExecucao(): array
    {
        $tenant = app(\App\Support\TenantContext::class)->get();
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

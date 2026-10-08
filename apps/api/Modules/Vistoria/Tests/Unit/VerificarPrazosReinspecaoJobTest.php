<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Jobs\VerificarPrazosReinspecaoJob;
use Modules\Vistoria\Models\Documento;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Reinspecao;
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class VerificarPrazosReinspecaoJobTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_cria_acompanhamento_para_documento_com_prazo_vencido_sem_registro(): void
    {
        $tenant = $this->criarTenant();

        $documento = $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucao();
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);

            // Simula o registro de acompanhamento nunca tendo sido criado (ex.: dado legado).
            Reinspecao::where('documento_id', $documento->id)->forceDelete();
            $documento->update(['prazo_limite' => now()->subDay()->toDateString()]);

            return $documento;
        });

        app()->call([new VerificarPrazosReinspecaoJob(), 'handle']);

        self::assertNotNull(Reinspecao::where('documento_id', $documento->id)->first());
    }

    public function test_nao_cria_acompanhamento_duplicado_quando_ja_existe(): void
    {
        $tenant = $this->criarTenant();

        $documento = $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucao();
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);
            $documento->update(['prazo_limite' => now()->subDay()->toDateString()]);

            return $documento;
        });

        app()->call([new VerificarPrazosReinspecaoJob(), 'handle']);

        self::assertSame(1, Reinspecao::where('documento_id', $documento->id)->count());
    }

    public function test_nao_cria_acompanhamento_para_prazo_ainda_nao_vencido(): void
    {
        $tenant = $this->criarTenant();

        $this->noTenant($tenant, function () {
            [$execucao] = $this->montarExecucao();
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);
            Reinspecao::where('documento_id', $documento->id)->forceDelete();

            app()->call([new VerificarPrazosReinspecaoJob(), 'handle']);

            self::assertNull(Reinspecao::where('documento_id', $documento->id)->first());
        });
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: \App\Models\User}
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

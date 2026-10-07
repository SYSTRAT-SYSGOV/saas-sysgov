<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

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
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class ReinspecaoControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->tenant = $this->criarTenant();
    }

    public function test_fiscal_da_reinspecao_visualiza_e_constata_regularizacao(): void
    {
        [$reinspecao, $fiscal] = $this->montarReinspecao();

        $this->como($fiscal, $this->tenant)->getJson("/api/vistoria/reinspecoes/{$reinspecao->id}")
            ->assertStatus(200)->assertJsonPath('status', Reinspecao::STATUS_PENDENTE);

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/reinspecoes/{$reinspecao->id}/regularizacao", [
            'regularizado' => true,
            'observacao' => 'Irregularidade sanada.',
        ])->assertStatus(200)->assertJsonPath('status', Reinspecao::STATUS_REGULARIZADO);
    }

    public function test_fiscal_de_outra_reinspecao_e_recusado(): void
    {
        [$reinspecao] = $this->montarReinspecao();
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');

        $this->como($outroFiscal, $this->tenant)->postJson("/api/vistoria/reinspecoes/{$reinspecao->id}/regularizacao", [
            'regularizado' => true,
        ])->assertStatus(403);
    }

    public function test_recusa_segunda_constatacao_com_422(): void
    {
        [$reinspecao, $fiscal] = $this->montarReinspecao();

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/reinspecoes/{$reinspecao->id}/regularizacao", [
            'regularizado' => true,
        ])->assertStatus(200);

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/reinspecoes/{$reinspecao->id}/regularizacao", [
            'regularizado' => false,
        ])->assertStatus(422);
    }

    /**
     * @return array{0: Reinspecao, 1: User}
     */
    private function montarReinspecao(): array
    {
        return $this->noTenant($this->tenant, function () {
            $proprietario = Pessoa::factory()->create(['nome' => 'Proprietário Teste']);
            $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Fazenda Teste',
                'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
                'latitude' => -25.4284,
                'longitude' => -49.2733,
            ]);
            $fiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Fiscal');
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
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_TERMO_EMBARGO, ['prazo_dias' => 10]);

            return [$documento->reinspecao, $fiscal];
        });
    }
}

<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\ExecucaoVistoria;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class EvidenciaControllerTest extends TestCase
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

    public function test_fiscal_anexa_documento_complementar_da_propria_execucao(): void
    {
        [$execucao, $fiscal] = $this->montarExecucao();
        $arquivo = UploadedFile::fake()->create('nota-fiscal.pdf', 50, 'application/pdf');

        $response = $this->como($fiscal, $this->tenant)->post("/api/vistoria/execucoes/{$execucao->id}/evidencias", [
            'arquivo' => $arquivo,
            'categoria' => 'nota_fiscal',
            'descricao' => 'NF 123',
        ]);

        $response->assertStatus(201)->assertJsonPath('categoria', 'nota_fiscal');
    }

    public function test_fiscal_de_outra_execucao_e_recusado(): void
    {
        [$execucao] = $this->montarExecucao();
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');
        $arquivo = UploadedFile::fake()->create('nota-fiscal.pdf', 50, 'application/pdf');

        $response = $this->como($outroFiscal, $this->tenant)->post("/api/vistoria/execucoes/{$execucao->id}/evidencias", [
            'arquivo' => $arquivo,
            'categoria' => 'nota_fiscal',
        ]);

        $response->assertStatus(403);
    }

    public function test_recusa_categoria_invalida_com_422(): void
    {
        [$execucao, $fiscal] = $this->montarExecucao();
        $arquivo = UploadedFile::fake()->create('arquivo.pdf', 10, 'application/pdf');

        $response = $this->como($fiscal, $this->tenant)->post("/api/vistoria/execucoes/{$execucao->id}/evidencias", [
            'arquivo' => $arquivo,
            'categoria' => 'categoria_inexistente',
        ]);

        $response->assertStatus(422);
    }

    public function test_baixa_o_arquivo_da_evidencia(): void
    {
        [$execucao, $fiscal] = $this->montarExecucao();
        $arquivo = UploadedFile::fake()->create('nota-fiscal.pdf', 50, 'application/pdf');

        $anexo = $this->como($fiscal, $this->tenant)->post("/api/vistoria/execucoes/{$execucao->id}/evidencias", [
            'arquivo' => $arquivo,
            'categoria' => 'nota_fiscal',
        ])->assertStatus(201);

        $response = $this->como($fiscal, $this->tenant)->get("/api/vistoria/evidencias/{$anexo->json('id')}/arquivo");

        $response->assertStatus(200);
    }

    /**
     * @return array{0: ExecucaoVistoria, 1: User}
     */
    private function montarExecucao(): array
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

            return [$execucao, $fiscal];
        });
    }
}

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
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class AssinaturaControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private const PNG_1X1_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->tenant = $this->criarTenant();
    }

    public function test_fiscal_sincroniza_assinatura_do_proprio_documento(): void
    {
        [$documento, $fiscal] = $this->montarDocumento();

        $response = $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/documentos/{$documento->id}/assinaturas/sincronizar", [
            'client_uuid' => (string) Str::uuid(),
            'papel' => 'autuado',
            'status' => 'assinada',
            'tracado_vetorial' => [['x' => 1, 'y' => 2]],
            'imagem_base64' => self::PNG_1X1_BASE64,
        ]);

        $response->assertStatus(201)->assertJsonPath('status', 'assinada');
    }

    public function test_fiscal_registra_recusa_de_assinatura(): void
    {
        [$documento, $fiscal] = $this->montarDocumento();

        $response = $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/documentos/{$documento->id}/assinaturas/sincronizar", [
            'client_uuid' => (string) Str::uuid(),
            'papel' => 'autuado',
            'status' => 'recusada',
            'motivo' => 'Recusou-se a assinar.',
        ]);

        $response->assertStatus(201)->assertJsonPath('status', 'recusada');
    }

    public function test_reenvio_com_mesmo_client_uuid_retorna_200_sem_duplicar(): void
    {
        [$documento, $fiscal] = $this->montarDocumento();
        $payload = [
            'client_uuid' => (string) Str::uuid(),
            'papel' => 'autuado',
            'status' => 'assinada',
            'tracado_vetorial' => [['x' => 1, 'y' => 2]],
            'imagem_base64' => self::PNG_1X1_BASE64,
        ];

        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/documentos/{$documento->id}/assinaturas/sincronizar", $payload)->assertStatus(201);
        $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/documentos/{$documento->id}/assinaturas/sincronizar", $payload)->assertStatus(200);
    }

    public function test_fiscal_de_outro_documento_e_recusado(): void
    {
        [$documento] = $this->montarDocumento();
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');

        $response = $this->como($outroFiscal, $this->tenant)->postJson("/api/vistoria/documentos/{$documento->id}/assinaturas/sincronizar", [
            'client_uuid' => (string) Str::uuid(),
            'papel' => 'autuado',
            'status' => 'assinada',
            'imagem_base64' => self::PNG_1X1_BASE64,
        ]);

        $response->assertStatus(403);
    }

    public function test_recusa_sem_motivo_retorna_422(): void
    {
        [$documento, $fiscal] = $this->montarDocumento();

        $response = $this->como($fiscal, $this->tenant)->postJson("/api/vistoria/documentos/{$documento->id}/assinaturas/sincronizar", [
            'client_uuid' => (string) Str::uuid(),
            'papel' => 'autuado',
            'status' => 'recusada',
        ]);

        $response->assertStatus(422);
    }

    /**
     * @return array{0: Documento, 1: User}
     */
    private function montarDocumento(): array
    {
        return $this->noTenant($this->tenant, function () {
            $proprietario = Pessoa::factory()->create();
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
            $documento = app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, []);

            return [$documento, $fiscal];
        });
    }
}

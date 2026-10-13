<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

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
use Modules\Vistoria\Services\DocumentoService;
use Modules\Vistoria\Services\IntegracaoVistoriaService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class AutuacoesPublicasControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_recusa_sem_credencial_com_401(): void
    {
        $this->getJson('/api/vistoria/autuacoes')->assertStatus(401);
    }

    public function test_recusa_credencial_invalida_com_401(): void
    {
        $this->withHeader('X-Vistoria-API-Key', 'chave-inexistente')
            ->getJson('/api/vistoria/autuacoes')
            ->assertStatus(401);
    }

    public function test_lista_autuacoes_do_tenant_da_credencial_sem_vazar_dados_autuado(): void
    {
        $tenant = $this->criarTenant();
        $apiKey = $this->emitirAutoDeInfracao($tenant);

        $response = $this->withHeader('X-Vistoria-API-Key', $apiKey)->getJson('/api/vistoria/autuacoes');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $primeiraAutuacao = $response->json('data.0');
        self::assertArrayNotHasKey('dados_autuado', $primeiraAutuacao);
        self::assertSame('auto_infracao/1/' . now()->year, $primeiraAutuacao['numero']);
    }

    public function test_credencial_de_um_tenant_nao_ve_autuacoes_de_outro(): void
    {
        $tenantA = $this->criarTenant();
        $tenantB = $this->criarTenant('prefeitura-b');
        $apiKeyA = $this->emitirAutoDeInfracao($tenantA);
        $this->emitirAutoDeInfracao($tenantB);

        $response = $this->withHeader('X-Vistoria-API-Key', $apiKeyA)->getJson('/api/vistoria/autuacoes');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_aceita_credencial_tambem_via_bearer_token(): void
    {
        $tenant = $this->criarTenant();
        $apiKey = $this->emitirAutoDeInfracao($tenant);

        $this->withHeader('Authorization', "Bearer {$apiKey}")
            ->getJson('/api/vistoria/autuacoes')
            ->assertStatus(200);
    }

    public function test_credencial_revogada_e_recusada(): void
    {
        $tenant = $this->criarTenant();
        $apiKey = $this->emitirAutoDeInfracao($tenant);

        $this->noTenant($tenant, function () use ($apiKey) {
            $integracao = \Modules\Vistoria\Models\VistoriaIntegracao::where('api_key', $apiKey)->first();
            app(IntegracaoVistoriaService::class)->revogar($integracao);
        });

        $this->withHeader('X-Vistoria-API-Key', $apiKey)
            ->getJson('/api/vistoria/autuacoes')
            ->assertStatus(401);
    }

    private function emitirAutoDeInfracao(Tenant $tenant): string
    {
        return $this->noTenant($tenant, function () use ($tenant) {
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
            app(DocumentoService::class)->emitirDocumento($execucao, Documento::TIPO_AUTO_INFRACAO, []);

            $integracao = app(IntegracaoVistoriaService::class)->criar('Sistema Externo X');

            return $integracao->getRawOriginal('api_key');
        });
    }
}

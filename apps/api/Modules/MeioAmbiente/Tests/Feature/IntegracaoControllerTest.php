<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\RelatorioAmbiental;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Services\IntegracaoMeioAmbienteService;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Modules\MeioAmbiente\Tests\Concerns\CriaExecucaoVistoria;
use Modules\Vistoria\Models\ProcessoSancionatorio;
use Tests\TestCase;

final class IntegracaoControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use CriaExecucaoVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    /** @return string chave em texto puro */
    private function credencial(Tenant $tenant): string
    {
        return $this->noTenant($tenant, fn () => app(IntegracaoMeioAmbienteService::class)->criar([
            'nome' => 'IBAMA', 'orgao' => MeioAmbienteIntegracao::ORGAO_IBAMA,
        ])['api_key']);
    }

    private function licencaDeferida(Tenant $tenant, string $numero, ?string $cnpj): void
    {
        $this->noTenant($tenant, function () use ($numero, $cnpj): void {
            $empreendimento = Empreendimento::create([
                'cnpj' => $cnpj, 'razao_social' => $cnpj ? 'Indústria Exemplo Ltda' : null, 'atividade' => 'industria',
                'porte' => Empreendimento::PORTE_MEDIO, 'latitude' => -25.4, 'longitude' => -49.2,
            ]);
            ProcessoLicenciamento::create([
                'empreendimento_id' => $empreendimento->id, 'fase' => ProcessoLicenciamento::FASE_LO, 'numero' => $numero,
                'numero_sequencial' => random_int(1, 99999), 'exercicio' => 2026,
                'status' => ProcessoLicenciamento::STATUS_DEFERIDO, 'data_deferimento' => '2026-08-01',
            ]);
        });
    }

    public function test_gestor_cria_credencial_e_a_chave_so_aparece_na_criacao(): void
    {
        $chefia = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');

        $resposta = $this->como($chefia, $this->tenant)->postJson('/api/meio_ambiente/integracoes', [
            'nome' => 'CETESB — envio de autos', 'orgao' => 'cetesb',
            'envio_url' => 'https://orgao.example.gov.br/recebimento', 'envio_token' => 'segredo-do-orgao',
        ])->assertCreated();

        $chave = $resposta->json('api_key');
        self::assertStringStartsWith(MeioAmbienteIntegracao::PREFIXO_CHAVE, $chave);
        self::assertTrue($resposta->json('envio_ativo'));

        $integracao = MeioAmbienteIntegracao::withoutGlobalScopes()->firstOrFail();
        self::assertSame(hash('sha256', $chave), $integracao->api_key_hash);
        self::assertNotSame('segredo-do-orgao', $integracao->getRawOriginal('envio_token'));

        $listagem = $this->como($chefia, $this->tenant)->getJson('/api/meio_ambiente/integracoes')->assertOk();
        self::assertStringNotContainsString($chave, $listagem->getContent());
        self::assertStringNotContainsString('segredo-do-orgao', $listagem->getContent());
    }

    public function test_envio_ativo_exige_https(): void
    {
        $chefia = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');

        $this->como($chefia, $this->tenant)->postJson('/api/meio_ambiente/integracoes', [
            'nome' => 'Órgão', 'orgao' => 'outro', 'envio_url' => 'http://orgao.example.gov.br/recebimento', 'envio_token' => 'x',
        ])->assertUnprocessable()->assertJsonValidationErrors('envio_url');
    }

    public function test_usuario_sem_permissao_de_integracoes_e_recusado(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)->getJson('/api/meio_ambiente/integracoes')->assertForbidden();
        $this->como($fiscal, $this->tenant)
            ->postJson('/api/meio_ambiente/integracoes', ['nome' => 'X', 'orgao' => 'ibama'])
            ->assertForbidden();
    }

    public function test_gestor_nao_revoga_credencial_de_outro_tenant(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $this->credencial($outroTenant);
        $alheia = MeioAmbienteIntegracao::withoutGlobalScopes()->firstOrFail();
        $chefia = $this->usuario($this->tenant, ['admin_meio_ambiente'], 'Chefia');

        $this->como($chefia, $this->tenant)->deleteJson("/api/meio_ambiente/integracoes/{$alheia->id}")->assertForbidden();

        self::assertTrue($alheia->refresh()->is_active);
    }

    public function test_consulta_de_licencas_emitidas_com_credencial_valida(): void
    {
        $chave = $this->credencial($this->tenant);
        $this->licencaDeferida($this->tenant, 'LO-0001/2026', '12345678000199');
        $this->licencaDeferida($this->criarTenant('prefeitura-b'), 'LO-9999/2026', '99999999000199');

        $resposta = $this->withToken($chave)->getJson('/api/meio_ambiente/publico/licencas')->assertOk();

        $resposta->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.numero', 'LO-0001/2026')
            ->assertJsonPath('data.0.empreendimento.cnpj', '12345678000199');
        self::assertNotNull(MeioAmbienteIntegracao::withoutGlobalScopes()->firstOrFail()->ultimo_uso_em);
    }

    public function test_titular_pessoa_fisica_nao_e_identificado_na_integracao(): void
    {
        $chave = $this->credencial($this->tenant);
        $this->licencaDeferida($this->tenant, 'LO-0002/2026', null);

        $this->withHeader('X-MeioAmbiente-API-Key', $chave)
            ->getJson('/api/meio_ambiente/publico/licencas')
            ->assertOk()
            ->assertJsonPath('data.0.empreendimento.pessoa_juridica', false)
            ->assertJsonPath('data.0.empreendimento.cnpj', null)
            ->assertJsonPath('data.0.empreendimento.razao_social', null);
    }

    public function test_credencial_ausente_ou_invalida_e_rejeitada(): void
    {
        foreach (['/publico/licencas', '/publico/autos-infracao', '/publico/relatorios-residuos'] as $rota) {
            $this->getJson("/api/meio_ambiente{$rota}")->assertUnauthorized();
            $this->withToken('mamb_chave-que-nao-existe')->getJson("/api/meio_ambiente{$rota}")->assertUnauthorized();
        }
    }

    public function test_credencial_revogada_e_rejeitada(): void
    {
        $chave = $this->credencial($this->tenant);
        $this->noTenant($this->tenant, fn () => app(IntegracaoMeioAmbienteService::class)->revogar(MeioAmbienteIntegracao::firstOrFail()));

        $this->withToken($chave)->getJson('/api/meio_ambiente/publico/licencas')->assertUnauthorized();
    }

    public function test_relatorios_de_residuos_expoem_so_rars_do_tenant(): void
    {
        $chave = $this->credencial($this->tenant);
        $this->noTenant($this->tenant, function (): void {
            RelatorioAmbiental::create(['tipo' => RelatorioAmbiental::TIPO_RARS, 'exercicio' => 2025, 'dados' => ['total_coletado_toneladas' => 10]]);
            RelatorioAmbiental::create(['tipo' => RelatorioAmbiental::TIPO_GEE, 'exercicio' => 2025, 'dados' => ['total_emissoes_tco2e' => 1]]);
        });

        $this->withToken($chave)
            ->getJson('/api/meio_ambiente/publico/relatorios-residuos?exercicio=2025')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.dados.total_coletado_toneladas', 10);
    }

    public function test_documentacao_openapi_e_publica(): void
    {
        $this->get('/api/meio_ambiente/docs')->assertOk()->assertSee('swagger-ui', false);

        $spec = $this->get('/api/meio_ambiente/docs/openapi.yaml')->assertOk();
        $spec->assertHeader('Content-Type', 'application/yaml');
        self::assertStringContainsString('/publico/licencas:', $spec->getContent());
    }

    public function test_consulta_de_autos_de_infracao_com_credencial_valida(): void
    {
        $chave = $this->credencial($this->tenant);
        $this->noTenant($this->tenant, function (): void {
            (new TabelaMultaAmbientalSeeder())->run();
            $empreendimento = Empreendimento::create([
                'cnpj' => '12345678000199', 'razao_social' => 'Indústria Exemplo Ltda', 'atividade' => 'industria',
                'porte' => Empreendimento::PORTE_MEDIO, 'latitude' => -25.4, 'longitude' => -49.2,
            ]);
            app(FiscalizacaoAmbientalService::class)->emitirAutoInfracaoAmbiental($this->criarExecucaoVistoriaConcluida(), $empreendimento, [
                'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO, 'area_afetada_ha' => 1,
            ]);
        });

        $this->withToken($chave)->getJson('/api/meio_ambiente/publico/autos-infracao')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.tipo_infracao', AutoInfracaoAmbiental::TIPO_DESMATAMENTO)
            ->assertJsonPath('data.0.processo_sancionatorio.status', ProcessoSancionatorio::STATUS_ABERTO)
            ->assertJsonPath('data.0.empreendimento.cnpj', '12345678000199');
    }
}

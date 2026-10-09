<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Unit;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Modules\MeioAmbiente\Database\Seeders\TabelaMultaAmbientalSeeder;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;
use Modules\MeioAmbiente\Services\EmpreendimentoService;
use Modules\MeioAmbiente\Services\FiscalizacaoAmbientalService;
use Modules\MeioAmbiente\Services\IntegracaoMeioAmbienteService;
use Modules\MeioAmbiente\Tests\Concerns\CriaExecucaoVistoria;
use Tests\TestCase;

final class EnvioAtivoOrgaoControleTest extends TestCase
{
    use CriaExecucaoVistoria;
    use RefreshDatabase;

    private const URL_ORGAO = 'https://orgao.example.gov.br/recebimento';

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'tenant-teste-' . uniqid(), 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);
        (new TabelaMultaAmbientalSeeder())->run();
    }

    private function integracaoComEnvioAtivo(): MeioAmbienteIntegracao
    {
        return app(IntegracaoMeioAmbienteService::class)->criar([
            'nome' => 'Órgão estadual', 'orgao' => MeioAmbienteIntegracao::ORGAO_INEA,
            'envio_url' => self::URL_ORGAO, 'envio_token' => 'token-do-orgao',
        ])['integracao'];
    }

    private function emitirAuto(): AutoInfracaoAmbiental
    {
        $empreendimento = app(EmpreendimentoService::class)->criarEmpreendimento([
            'cnpj' => '12345678000199', 'razao_social' => 'Agropecuária Exemplo Ltda', 'atividade' => 'agroindustria',
            'porte' => Empreendimento::PORTE_GRANDE, 'latitude' => -25.4284, 'longitude' => -49.2733,
        ]);

        return app(FiscalizacaoAmbientalService::class)->emitirAutoInfracaoAmbiental($this->criarExecucaoVistoriaConcluida(), $empreendimento, [
            'tipo_infracao' => AutoInfracaoAmbiental::TIPO_DESMATAMENTO,
            'area_afetada_ha' => 2,
        ]);
    }

    public function test_emissao_de_auto_agenda_envio_sem_chamar_o_orgao(): void
    {
        Http::fake();
        $integracao = $this->integracaoComEnvioAtivo();

        $auto = $this->emitirAuto();

        Http::assertNothingSent();
        $evento = OutboxEvent::where('event_type', IntegracaoMeioAmbienteService::EVENTO_ENVIO_AUTO_INFRACAO)->sole();
        self::assertSame(['integracao_id' => $integracao->id, 'auto_infracao_id' => $auto->id], $evento->payload);
        self::assertSame('pending', $evento->status);
        self::assertSame($this->tenant->id, $evento->tenant_id);
    }

    public function test_sem_integracao_com_envio_ativo_nada_e_agendado(): void
    {
        app(IntegracaoMeioAmbienteService::class)->criar(['nome' => 'Só consulta', 'orgao' => MeioAmbienteIntegracao::ORGAO_IBAMA]);

        $this->emitirAuto();

        self::assertSame(0, OutboxEvent::where('event_type', IntegracaoMeioAmbienteService::EVENTO_ENVIO_AUTO_INFRACAO)->count());
    }

    public function test_falha_de_envio_e_registrada_para_reprocessamento(): void
    {
        $this->integracaoComEnvioAtivo();
        $auto = $this->emitirAuto();
        app(TenantContext::class)->clear();
        Http::fake([self::URL_ORGAO => Http::response('Serviço indisponível', 503)]);

        $this->artisan('outbox:process')->assertSuccessful();

        $evento = OutboxEvent::where('event_type', IntegracaoMeioAmbienteService::EVENTO_ENVIO_AUTO_INFRACAO)->sole();
        self::assertSame('pending', $evento->status);
        self::assertSame(1, (int) $evento->attempts);
        self::assertNotNull($evento->error);
        self::assertTrue($evento->available_at->isFuture());
        // O auto de infração continua emitido — a falha do órgão não desfaz nada.
        self::assertTrue(AutoInfracaoAmbiental::withoutGlobalScopes()->whereKey($auto->id)->exists());
        self::assertFalse(app(TenantContext::class)->hasTenant());
    }

    public function test_envio_bem_sucedido_entrega_o_auto_ao_orgao(): void
    {
        $this->integracaoComEnvioAtivo();
        $auto = $this->emitirAuto();
        app(TenantContext::class)->clear();
        Http::fake([self::URL_ORGAO => Http::response(['recebido' => true], 202)]);

        $this->artisan('outbox:process')->assertSuccessful();

        $evento = OutboxEvent::where('event_type', IntegracaoMeioAmbienteService::EVENTO_ENVIO_AUTO_INFRACAO)->sole();
        self::assertSame('done', $evento->status);
        Http::assertSent(fn (Request $request): bool => $request->url() === self::URL_ORGAO
            && $request->hasHeader('Authorization', 'Bearer token-do-orgao')
            && $request['id_evento'] === $evento->event_id
            && $request['dados']['id'] === $auto->id
            && $request['dados']['empreendimento']['cnpj'] === '12345678000199');
    }

    public function test_credencial_revogada_descarta_o_envio_sem_retentativa(): void
    {
        $integracao = $this->integracaoComEnvioAtivo();
        $this->emitirAuto();
        app(IntegracaoMeioAmbienteService::class)->revogar($integracao);
        app(TenantContext::class)->clear();
        Http::fake();

        $this->artisan('outbox:process')->assertSuccessful();

        Http::assertNothingSent();
        self::assertSame('done', OutboxEvent::where('event_type', IntegracaoMeioAmbienteService::EVENTO_ENVIO_AUTO_INFRACAO)->sole()->status);
    }
}

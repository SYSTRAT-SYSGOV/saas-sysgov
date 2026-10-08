<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Modules\OrgChart\Models\OrgUnit;
use Modules\Pessoas\Models\Pessoa;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Models\ModeloFormulario;
use Modules\Vistoria\Models\OrdemServico;
use Modules\Vistoria\Models\Pergunta;
use Modules\Vistoria\Models\RespostaChecklist;
use Modules\Vistoria\Services\FormularioService;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class ExecucaoVistoriaControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
    }

    public function test_fiscal_sincroniza_execucao_da_propria_ordem(): void
    {
        [$ordem, $fiscal] = $this->montarOrdem();

        $response = $this->como($fiscal, $this->tenant)->postJson('/api/vistoria/execucoes/sincronizar', [
            'client_uuid' => (string) Str::uuid(),
            'ordem_servico_id' => $ordem->id,
            'dados' => ['observacao' => 'Tudo regular'],
        ]);

        $response->assertStatus(201)->assertJsonPath('status', 'sincronizada');
        self::assertSame(OrdemServico::STATUS_CONCLUIDA, $ordem->fresh()->status);
    }

    public function test_reenvio_com_mesmo_client_uuid_retorna_200_sem_duplicar(): void
    {
        [$ordem, $fiscal] = $this->montarOrdem();
        $clientUuid = (string) Str::uuid();
        $payload = ['client_uuid' => $clientUuid, 'ordem_servico_id' => $ordem->id, 'dados' => ['observacao' => 'Envio']];

        $primeiro = $this->como($fiscal, $this->tenant)->postJson('/api/vistoria/execucoes/sincronizar', $payload);
        $primeiro->assertStatus(201);
        $idCriado = $primeiro->json('id');

        $segundo = $this->como($fiscal, $this->tenant)->postJson('/api/vistoria/execucoes/sincronizar', $payload);
        $segundo->assertStatus(200)->assertJsonPath('id', $idCriado);
    }

    public function test_fiscal_nao_sincroniza_execucao_de_ordem_de_outro_fiscal(): void
    {
        [$ordem] = $this->montarOrdem();
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');

        $response = $this->como($outroFiscal, $this->tenant)->postJson('/api/vistoria/execucoes/sincronizar', [
            'client_uuid' => (string) Str::uuid(),
            'ordem_servico_id' => $ordem->id,
            'dados' => ['observacao' => 'Tentativa indevida'],
        ]);

        $response->assertStatus(403);
    }

    public function test_pacote_do_dia_retorna_apenas_ordens_do_fiscal_autenticado_com_historico_do_local(): void
    {
        [$ordem, $fiscal] = $this->montarOrdem();
        $this->noTenant($this->tenant, function () use ($ordem) {
            $ordem->update(['status' => OrdemServico::STATUS_CONCLUIDA]);
        });
        $outroFiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Outro Fiscal');

        $response = $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/pacote-do-dia');

        $response->assertStatus(200)->assertJsonCount(1, 'ordens');
        self::assertSame($ordem->id, $response->json('ordens.0.ordem.id'));
        self::assertNotEmpty($response->json('ordens.0.historico_local'));

        $response2 = $this->como($outroFiscal, $this->tenant)->getJson('/api/vistoria/pacote-do-dia');
        $response2->assertStatus(200)->assertJsonCount(0, 'ordens');
    }

    public function test_sincronizacao_e_recusada_quando_falta_resposta_de_pergunta_obrigatoria(): void
    {
        [$ordem, $fiscal, $modelo] = $this->montarOrdemComFormulario();
        $perguntaObrigatoria = $modelo->perguntas->firstWhere('obrigatoria', true);

        $response = $this->como($fiscal, $this->tenant)->postJson('/api/vistoria/execucoes/sincronizar', [
            'client_uuid' => (string) Str::uuid(),
            'ordem_servico_id' => $ordem->id,
            'dados' => ['respostas' => []],
        ]);

        $response->assertStatus(422)->assertJsonFragment(['message' => "Pergunta obrigatória não respondida: \"{$perguntaObrigatoria->enunciado}\"."]);
        self::assertSame(OrdemServico::STATUS_AGENDADA, $ordem->fresh()->status);
    }

    public function test_sincronizacao_persiste_respostas_do_checklist_com_georreferenciamento(): void
    {
        [$ordem, $fiscal, $modelo] = $this->montarOrdemComFormulario();
        $pergunta = $modelo->perguntas->firstWhere('obrigatoria', true);

        $response = $this->como($fiscal, $this->tenant)->postJson('/api/vistoria/execucoes/sincronizar', [
            'client_uuid' => (string) Str::uuid(),
            'ordem_servico_id' => $ordem->id,
            'dados' => [
                'respostas' => [
                    ['pergunta_id' => $pergunta->id, 'valor' => 'Sim', 'latitude' => -25.4284, 'longitude' => -49.2733, 'capturado_em' => now()->toIso8601String()],
                ],
            ],
        ]);

        $response->assertStatus(201);

        $resposta = $this->noTenant($this->tenant, fn () => RespostaChecklist::where('pergunta_id', $pergunta->id)->first());
        self::assertNotNull($resposta);
        self::assertSame('Sim', $resposta->valor);
        self::assertEqualsWithDelta(-25.4284, (float) $resposta->latitude, 0.0001);
    }

    public function test_pacote_do_dia_embute_o_formulario_aplicavel(): void
    {
        [$ordem, $fiscal, $modelo] = $this->montarOrdemComFormulario();

        $response = $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/pacote-do-dia');

        $response->assertStatus(200)->assertJsonPath('ordens.0.formulario.id', $modelo->id);
        // Eloquent serializa a relação perguntasAtivas() como "perguntas_ativas" (snake_case do nome do método).
        self::assertNotEmpty($response->json('ordens.0.formulario.perguntas_ativas'));
        self::assertSame($ordem->id, $response->json('ordens.0.ordem.id'));
    }

    /**
     * @return array{0: OrdemServico, 1: User, 2: ModeloFormulario}
     */
    private function montarOrdemComFormulario(): array
    {
        return $this->noTenant($this->tenant, function () {
            $modelo = app(FormularioService::class)->criarModeloFormulario([
                'tipo_fiscalizacao' => 'agroindustria',
                'nome' => 'Checklist Agroindústria',
                'perguntas' => [
                    ['enunciado' => 'Possui alvará sanitário vigente?', 'tipo' => Pergunta::TIPO_MULTIPLA_ESCOLHA, 'opcoes' => ['Sim', 'Não'], 'obrigatoria' => true],
                    ['enunciado' => 'Observações gerais', 'tipo' => Pergunta::TIPO_TEXTO_LIVRE, 'obrigatoria' => false],
                ],
            ]);

            $proprietario = Pessoa::factory()->create();
            $orgUnit = OrgUnit::create(['name' => 'Secretaria de Agricultura', 'code' => 'SEC-AGRI-' . uniqid()]);
            $local = LocalFiscalizavel::create([
                'proprietario_pessoa_id' => $proprietario->id,
                'nome' => 'Agroindústria Teste',
                'tipo' => LocalFiscalizavel::TIPO_ESTABELECIMENTO_COMERCIAL,
                'classificacao_atividade' => 'agroindustria',
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

            return [$ordem, $fiscal, $modelo->load('perguntas')];
        });
    }

    /**
     * @return array{0: OrdemServico, 1: User}
     */
    private function montarOrdem(): array
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

            return [$ordem, $fiscal];
        });
    }
}

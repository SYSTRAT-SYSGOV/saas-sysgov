<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\OutorgaAgua;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class RecursosHidricosControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    private Empreendimento $empreendimento;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');

        $this->empreendimento = $this->noTenant($this->tenant, fn () => Empreendimento::create([
            'cnpj' => '12345678000199', 'razao_social' => 'Indústria Exemplo Ltda', 'atividade' => 'industria_quimica',
            'porte' => Empreendimento::PORTE_GRANDE, 'latitude' => -25.4284, 'longitude' => -49.2733,
        ]));
    }

    public function test_gestor_cadastra_outorga_de_agua_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $resposta = $this->como($gestor, $this->tenant)
            ->postJson("/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}/outorgas-agua", [
                'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO,
                'vazao_m3_hora' => 10,
                'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
            ]);

        $resposta->assertCreated();
        self::assertSame(1, OutorgaAgua::count());
    }

    public function test_fiscal_sem_permissao_de_recursos_hidricos_e_recusado(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)
            ->postJson("/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}/outorgas-agua", [
                'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO,
                'vazao_m3_hora' => 10,
                'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
            ])
            ->assertForbidden();

        self::assertSame(0, OutorgaAgua::count());
    }

    public function test_gestor_cadastra_licenca_efluente_com_parametros_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $resposta = $this->como($gestor, $this->tenant)
            ->postJson("/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}/licencas-efluente", [
                'parametros' => [
                    ['parametro' => 'pH', 'limite_min' => 6, 'limite_max' => 9],
                ],
            ]);

        $resposta->assertCreated()->assertJsonCount(1, 'parametros');
    }

    public function test_lista_outorgas_e_licencas_e_registra_medicao(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $base = "/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}";

        $this->como($gestor, $this->tenant)->postJson("{$base}/outorgas-agua", [
            'tipo_captacao' => OutorgaAgua::TIPO_CAPTACAO_POCO, 'vazao_m3_hora' => 5, 'finalidade' => OutorgaAgua::FINALIDADE_INDUSTRIAL,
        ])->assertCreated();
        $licenca = $this->como($gestor, $this->tenant)->postJson("{$base}/licencas-efluente", ['parametros' => [['parametro' => 'DBO', 'limite_max' => 60, 'unidade' => 'mg/L']]])
            ->assertCreated();
        $parametroId = $licenca->json('parametros.0.id');

        $this->como($gestor, $this->tenant)->getJson("{$base}/outorgas-agua")->assertOk()->assertJsonCount(1, 'data');
        $this->como($gestor, $this->tenant)->getJson("{$base}/licencas-efluente")->assertOk()->assertJsonCount(1, 'data');

        $this->como($gestor, $this->tenant)->postJson("/api/meio_ambiente/parametros-qualidade-efluente/{$parametroId}/medicoes", [])
            ->assertUnprocessable()->assertJsonValidationErrors('valor');
        $this->como($gestor, $this->tenant)->postJson("/api/meio_ambiente/parametros-qualidade-efluente/{$parametroId}/medicoes", ['valor' => 80])
            ->assertCreated()->assertJsonPath('conforme', false);
    }

    public function test_licenca_de_efluente_sem_parametros_e_listagem_sem_permissao_sao_recusadas(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $base = "/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}";

        $this->como($gestor, $this->tenant)->postJson("{$base}/licencas-efluente", ['parametros' => []])
            ->assertUnprocessable()->assertJsonValidationErrors('parametros');

        $semPerfil = $this->usuario($this->tenant, [], 'Sem perfil');
        $this->como($semPerfil, $this->tenant)->getJson("{$base}/outorgas-agua")->assertForbidden();
        $this->como($semPerfil, $this->tenant)->getJson("{$base}/licencas-efluente")->assertForbidden();
    }
}

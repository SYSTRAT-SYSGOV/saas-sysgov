<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

final class OcorrenciaQueimadaControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
    }

    public function test_fiscal_registra_ocorrencia_de_queimada_via_api(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $resposta = $this->como($fiscal, $this->tenant)->postJson('/api/meio_ambiente/ocorrencias-queimada', [
            'data_ocorrencia' => now()->toDateString(),
            'latitude' => -25.4284,
            'longitude' => -49.2733,
            'area_queimada_ha' => 4.2,
        ]);

        $resposta->assertCreated()->assertJsonPath('situacao', OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO);
        self::assertSame(1, OcorrenciaQueimada::count());
    }

    public function test_analista_sem_permissao_de_queimadas_e_recusado(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $this->como($analista, $this->tenant)->postJson('/api/meio_ambiente/ocorrencias-queimada', [
            'data_ocorrencia' => now()->toDateString(),
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ])->assertForbidden();

        self::assertSame(0, OcorrenciaQueimada::count());
    }

    public function test_mapa_de_focos_responde_feature_collection(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');
        $this->noTenant($this->tenant, fn () => OcorrenciaQueimada::create([
            'data_ocorrencia' => now()->toDateString(), 'latitude' => -25.4284, 'longitude' => -49.2733,
            'situacao' => OcorrenciaQueimada::SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO,
        ]));

        $this->como($fiscal, $this->tenant)->getJson('/api/meio_ambiente/ocorrencias-queimada/mapa')
            ->assertOk()
            ->assertJsonCount(1, 'features');
    }

    public function test_lista_ocorrencias_e_vincula_responsavel(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');
        $id = $this->como($fiscal, $this->tenant)->postJson('/api/meio_ambiente/ocorrencias-queimada', [
            'data_ocorrencia' => now()->toDateString(), 'latitude' => -25.4, 'longitude' => -49.2, 'area_queimada_ha' => 2,
        ])->assertCreated()->json('id');
        $pessoa = $this->noTenant($this->tenant, fn () => Pessoa::factory()->create());

        $this->como($fiscal, $this->tenant)->getJson('/api/meio_ambiente/ocorrencias-queimada')->assertOk()->assertJsonCount(1, 'data');
        $this->como($fiscal, $this->tenant)->postJson("/api/meio_ambiente/ocorrencias-queimada/{$id}/responsavel", ['responsavel_pessoa_id' => $pessoa->id])
            ->assertOk()->assertJsonPath('situacao', OcorrenciaQueimada::SITUACAO_RESPONSAVEL_IDENTIFICADO);
    }

    public function test_vinculo_com_pessoa_inexistente_e_listagem_sem_permissao_sao_recusados(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');
        $id = $this->como($fiscal, $this->tenant)->postJson('/api/meio_ambiente/ocorrencias-queimada', [
            'data_ocorrencia' => now()->toDateString(), 'latitude' => -25.4, 'longitude' => -49.2,
        ])->assertCreated()->json('id');

        $this->como($fiscal, $this->tenant)->postJson("/api/meio_ambiente/ocorrencias-queimada/{$id}/responsavel", ['responsavel_pessoa_id' => 999_999])
            ->assertUnprocessable()->assertJsonValidationErrors('responsavel_pessoa_id');

        $semPerfil = $this->usuario($this->tenant, [], 'Sem perfil');
        $this->como($semPerfil, $this->tenant)->getJson('/api/meio_ambiente/ocorrencias-queimada')->assertForbidden();
        $this->como($semPerfil, $this->tenant)->getJson('/api/meio_ambiente/ocorrencias-queimada/mapa')->assertForbidden();
    }
}

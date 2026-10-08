<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class ProcessoLicenciamentoControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    private Empreendimento $empreendimento;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');

        $this->empreendimento = $this->noTenant($this->tenant, function (): Empreendimento {
            $empreendimento = Empreendimento::create([
                'cnpj' => '12345678000199', 'razao_social' => 'Indústria Exemplo Ltda', 'atividade' => 'industria_quimica',
                'porte' => Empreendimento::PORTE_MEDIO, 'latitude' => -25.4284, 'longitude' => -49.2733,
            ]);
            ResponsavelTecnico::create([
                'empreendimento_id' => $empreendimento->id, 'nome' => 'Engenheira Responsável',
                'registro_profissional' => 'CREA-PR 123456', 'tipo_registro' => ResponsavelTecnico::TIPO_CREA,
            ]);

            return $empreendimento;
        });
    }

    public function test_analista_abre_processo_de_licenciamento_via_api(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');

        $resposta = $this->como($analista, $this->tenant)
            ->postJson("/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}/processos-licenciamento", ['fase' => ProcessoLicenciamento::FASE_LP]);

        $resposta->assertCreated()->assertJsonPath('status', ProcessoLicenciamento::STATUS_EM_ANALISE);
        self::assertSame(1, ProcessoLicenciamento::count());
    }

    public function test_fiscal_sem_permissao_de_licenciamento_e_recusado(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)
            ->postJson("/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}/processos-licenciamento", ['fase' => ProcessoLicenciamento::FASE_LP])
            ->assertForbidden();

        self::assertSame(0, ProcessoLicenciamento::count());
    }

    public function test_fluxo_completo_vistoria_favoravel_e_deferimento(): void
    {
        $analista = $this->usuario($this->tenant, ['analista_licenciamento_ambiental'], 'Analista');
        $cliente = $this->como($analista, $this->tenant);

        $processoId = $cliente
            ->postJson("/api/meio_ambiente/empreendimentos/{$this->empreendimento->id}/processos-licenciamento", ['fase' => ProcessoLicenciamento::FASE_LP])
            ->json('id');

        $cliente->postJson("/api/meio_ambiente/processos-licenciamento/{$processoId}/vistoria-tecnica", ['resultado' => 'favoravel'])
            ->assertCreated();

        $cliente->postJson("/api/meio_ambiente/processos-licenciamento/{$processoId}/deferir", [])
            ->assertOk()
            ->assertJsonPath('status', ProcessoLicenciamento::STATUS_DEFERIDO);
    }
}

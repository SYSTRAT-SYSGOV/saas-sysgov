<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;
use Modules\MeioAmbiente\Models\DestinacaoCompensacao;
use Modules\MeioAmbiente\Models\Empreendimento;
use Modules\MeioAmbiente\Models\PagamentoCompensacao;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;
use Modules\MeioAmbiente\Tests\Concerns\CenarioMeioAmbiente;
use Tests\TestCase;

final class CompensacaoAmbientalControllerTest extends TestCase
{
    use CenarioMeioAmbiente;
    use RefreshDatabase;

    private Tenant $tenant;

    private CompensacaoAmbiental $compensacao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');

        $this->compensacao = $this->noTenant($this->tenant, function (): CompensacaoAmbiental {
            $empreendimento = Empreendimento::create([
                'cnpj' => '12345678000199', 'razao_social' => 'Indústria Exemplo Ltda', 'atividade' => 'industria_quimica',
                'porte' => Empreendimento::PORTE_MEDIO, 'impacto_significativo' => true, 'valor_empreendimento_centavos' => 100_000_000,
                'latitude' => -25.4284, 'longitude' => -49.2733,
            ]);
            $processo = ProcessoLicenciamento::create([
                'empreendimento_id' => $empreendimento->id, 'fase' => ProcessoLicenciamento::FASE_LP,
                'numero' => 'LP/2026/0001', 'numero_sequencial' => 1, 'exercicio' => 2026,
                'status' => ProcessoLicenciamento::STATUS_DEFERIDO, 'data_deferimento' => now(), 'validade_em' => now()->addDays(180),
            ]);

            return CompensacaoAmbiental::create([
                'empreendimento_id' => $empreendimento->id, 'processo_licenciamento_id' => $processo->id,
                'percentual' => CompensacaoAmbiental::PERCENTUAL_PADRAO, 'valor_devido_centavos' => 500_000,
            ]);
        });
    }

    public function test_gestor_registra_pagamento_via_api(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $resposta = $this->como($gestor, $this->tenant)
            ->postJson("/api/meio_ambiente/compensacoes-ambientais/{$this->compensacao->id}/pagamentos", ['valor_centavos' => 200_000]);

        $resposta->assertCreated();
        self::assertSame(1, PagamentoCompensacao::count());
    }

    public function test_fiscal_sem_permissao_de_compensacao_e_recusado(): void
    {
        $fiscal = $this->usuario($this->tenant, ['fiscal_ambiental'], 'Fiscal');

        $this->como($fiscal, $this->tenant)
            ->postJson("/api/meio_ambiente/compensacoes-ambientais/{$this->compensacao->id}/pagamentos", ['valor_centavos' => 200_000])
            ->assertForbidden();

        self::assertSame(0, PagamentoCompensacao::count());
    }

    public function test_lista_e_detalha_compensacoes_do_empreendimento(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');

        $this->como($gestor, $this->tenant)->getJson("/api/meio_ambiente/empreendimentos/{$this->compensacao->empreendimento_id}/compensacoes-ambientais")
            ->assertOk()->assertJsonCount(1, 'data');
        $this->como($gestor, $this->tenant)->getJson("/api/meio_ambiente/compensacoes-ambientais/{$this->compensacao->id}")
            ->assertOk()->assertJsonPath('valor_devido_centavos', 500_000);

        $semPerfil = $this->usuario($this->tenant, [], 'Sem perfil');
        $this->como($semPerfil, $this->tenant)->getJson("/api/meio_ambiente/compensacoes-ambientais/{$this->compensacao->id}")->assertForbidden();
    }

    public function test_destinacao_nao_pode_exceder_o_valor_pago(): void
    {
        $gestor = $this->usuario($this->tenant, ['gestor_recursos_naturais'], 'Gestor');
        $url = "/api/meio_ambiente/compensacoes-ambientais/{$this->compensacao->id}";
        $this->como($gestor, $this->tenant)->postJson("{$url}/pagamentos", ['valor_centavos' => 100_000])->assertCreated();

        $this->como($gestor, $this->tenant)->postJson("{$url}/destinacoes", ['destino' => DestinacaoCompensacao::DESTINO_FUNDO_MUNICIPAL, 'valor_centavos' => 100_001])
            ->assertUnprocessable();
        $this->como($gestor, $this->tenant)->postJson("{$url}/destinacoes", ['destino' => DestinacaoCompensacao::DESTINO_FUNDO_MUNICIPAL, 'valor_centavos' => 100_000])
            ->assertCreated();
    }
}

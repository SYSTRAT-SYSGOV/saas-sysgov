<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class VeiculosTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_placa_e_normalizada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['placa' => 'abc-1d23']))
            ->assertCreated()->assertJsonPath('data.placa', 'ABC1D23');
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['placa' => 'xyz 1234']))
            ->assertCreated()->assertJsonPath('data.placa', 'XYZ1234');
    }

    public function test_placa_invalida_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['placa' => '12AB345']))->assertUnprocessable();
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['placa' => 'ABCD123']))->assertUnprocessable();
    }

    public function test_placa_duplicada_da_conflito(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarVeiculo($t, $g, ['placa' => 'ABC1D23']);

        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['placa' => 'abc1d23']))->assertConflict();
    }

    public function test_mesma_placa_em_outro_tenant_e_permitida(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $this->criarVeiculo($a, $this->usuario($a, ['transporte_coordenacao']), ['placa' => 'ABC1D23']);

        $id = $this->criarVeiculo($b, $this->usuario($b, ['transporte_coordenacao']), ['placa' => 'ABC1D23']);

        $this->assertGreaterThan(0, $id);
    }

    public function test_capacidade_e_tipologia_invalidas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['capacidade' => 0]))->assertUnprocessable()->assertJsonValidationErrors(['capacidade']);
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['tipologia_inep' => 12]))->assertUnprocessable()->assertJsonValidationErrors(['tipologia_inep']);
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['tipologia_inep' => 0]))->assertUnprocessable();
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['tipologia_inep' => 11]))->assertCreated()->assertJsonPath('data.tipologia_rotulo', 'Ferroviário (trem / metrô)');
    }

    public function test_inativacao_exige_motivo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosVeiculo();
        $id = $this->como($g, $t)->postJson('/api/transporte/veiculos', $dados)->assertCreated()->json('data.id');

        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$id}", [...$dados, 'ativo' => false])->assertUnprocessable();
        $this->como($g, $t)->getJson('/api/transporte/veiculos')->assertJsonPath('data.0.ativo', true);
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$id}", [...$dados, 'ativo' => false, 'motivo_inativacao' => 'Em manutenção prolongada'])
            ->assertOk()->assertJsonPath('data.ativo', false)->assertJsonPath('data.motivo_inativacao', 'Em manutenção prolongada');
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$id}", [...$dados, 'ativo' => true])->assertOk()->assertJsonPath('data.motivo_inativacao', null);
    }

    public function test_veiculo_proprio_nao_tem_empresa(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $empresa = $this->criarEmpresa($t, $g, ['tipo' => 'locadora']);

        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo())->assertCreated()->assertJsonPath('data.empresa', null)->assertJsonPath('data.origem', 'propria');
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['empresa_id' => $empresa]))->assertUnprocessable();
    }

    public function test_veiculo_locado_exige_locadora_e_terceirizado_exige_prestadora(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $locadora = $this->criarEmpresa($t, $g, ['tipo' => 'locadora']);
        $prestadora = $this->criarEmpresa($t, $g, ['tipo' => 'prestadora']);

        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['origem' => 'locada']))->assertUnprocessable();
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['origem' => 'locada', 'empresa_id' => $prestadora]))->assertUnprocessable();
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['origem' => 'locada', 'empresa_id' => $locadora]))->assertCreated();
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['origem' => 'terceirizada', 'empresa_id' => $locadora]))->assertUnprocessable();
        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['origem' => 'terceirizada', 'empresa_id' => $prestadora]))->assertCreated();
    }

    public function test_locadora_com_contrato_vencido_deixa_o_veiculo_irregular(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $locadora = $this->criarEmpresa($t, $g, ['tipo' => 'locadora', 'vigencia_inicio' => now()->subYear()->toDateString(), 'vigencia_fim' => now()->subDay()->toDateString()]);
        $locado = $this->criarVeiculo($t, $g, ['origem' => 'locada', 'empresa_id' => $locadora, 'placa' => 'LOC1A23']);
        $proprio = $this->criarVeiculo($t, $g, ['placa' => 'PRO1A23']);
        $this->registrarVistoria($t, $g, $locado, now()->addMonths(3)->toDateString());
        $this->registrarVistoria($t, $g, $proprio, now()->addMonths(3)->toDateString());

        /** @var array<string, array<string, mixed>> $lista */
        $lista = array_column($this->como($g, $t)->getJson('/api/transporte/veiculos')->json('data'), null, 'placa');
        $this->assertFalse($lista['LOC1A23']['regular']);
        $this->assertSame(['contrato_vencido'], $lista['LOC1A23']['motivos_irregularidade']);
        $this->assertTrue($lista['PRO1A23']['regular']);
    }

    public function test_veiculo_excluido_libera_a_placa(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarVeiculo($t, $g, ['placa' => 'ABC1D23']);
        $this->como($g, $t)->deleteJson("/api/transporte/veiculos/{$id}")->assertOk();
        $this->como($g, $t)->getJson('/api/transporte/veiculos')->assertJsonCount(0, 'data');

        $this->como($g, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['placa' => 'ABC1D23']))->assertCreated();
    }

    public function test_opcoes_trazem_listas_e_permissoes(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_consulta']);

        $r = $this->como($g, $t)->getJson('/api/transporte/opcoes')->assertOk();
        $r->assertJsonCount(11, 'data.tipologias')->assertJsonPath('data.permissoes.gerenciar_frota', false)->assertJsonPath('data.permissoes.auditar', false);
        $this->assertSame(['propria', 'locada', 'terceirizada'], array_column($r->json('data.origens'), 'valor'));
    }
}

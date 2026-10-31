<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class EmpresasTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_cria_empresa_prestadora_com_dados_do_cadastro_de_pessoas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $r = $this->como($g, $t)->postJson('/api/transporte/empresas', $this->dadosEmpresa(['razao_social' => 'Viação Rio Claro', 'contrato_numero' => '12/2026']))->assertCreated();

        $r->assertJsonPath('data.nome', 'Viação Rio Claro')->assertJsonPath('data.tipo', 'prestadora')->assertJsonPath('data.ativa', true)
            ->assertJsonPath('data.contrato_vencido', false);
        $this->assertNotNull($r->json('data.cnpj_mascarado'));
    }

    public function test_empresa_sem_contrato_ou_vigencia_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosEmpresa(['tipo' => 'locadora']);
        unset($dados['vigencia_inicio'], $dados['vigencia_fim'], $dados['contrato_numero']);

        $this->como($g, $t)->postJson('/api/transporte/empresas', $dados)->assertUnprocessable()
            ->assertJsonValidationErrors(['contrato_numero', 'vigencia_inicio', 'vigencia_fim']);
    }

    public function test_vigencia_final_anterior_ao_inicio_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/empresas', $this->dadosEmpresa(['vigencia_fim' => now()->subYear()->toDateString()]))
            ->assertUnprocessable()->assertJsonValidationErrors(['vigencia_fim']);
    }

    public function test_pessoa_fisica_nao_pode_ser_empresa(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $pessoa = $this->noTenant($t, fn () => Pessoa::create(['documento' => $this->cpf(900), 'tipo' => 'fisica', 'nome' => 'Fulano de Tal']));
        $dados = $this->dadosEmpresa(['pessoa_id' => $pessoa->id]);
        unset($dados['cnpj'], $dados['razao_social']);

        $this->como($g, $t)->postJson('/api/transporte/empresas', $dados)->assertUnprocessable()->assertJsonPath('error', 'A empresa deve ser uma pessoa jurídica.');
    }

    public function test_cnpj_invalido_e_recusado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/empresas', $this->dadosEmpresa(['cnpj' => '11111111111111']))->assertUnprocessable();
    }

    public function test_mesma_pessoa_juridica_duas_vezes_da_conflito(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosEmpresa();
        $this->como($g, $t)->postJson('/api/transporte/empresas', $dados)->assertCreated();

        $this->como($g, $t)->postJson('/api/transporte/empresas', $dados)->assertConflict();
    }

    public function test_contrato_vencido_e_sinalizado_e_gera_alerta_critico(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarEmpresa($t, $g, ['vigencia_inicio' => now()->subYear()->toDateString(), 'vigencia_fim' => now()->subDay()->toDateString()]);

        $this->como($g, $t)->getJson('/api/transporte/empresas')->assertJsonPath('data.0.contrato_vencido', true);
        $this->como($g, $t)->getJson('/api/transporte/alertas')->assertJsonPath('data.0.tipo', 'contrato')->assertJsonPath('data.0.gravidade', 'critico');
    }

    public function test_empresa_com_veiculo_nao_e_excluida(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $empresa = $this->criarEmpresa($t, $g, ['tipo' => 'locadora']);
        $this->criarVeiculo($t, $g, ['origem' => 'locada', 'empresa_id' => $empresa]);

        $this->como($g, $t)->deleteJson("/api/transporte/empresas/{$empresa}")->assertConflict();
    }

    public function test_empresa_excluida_pode_ser_cadastrada_de_novo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosEmpresa();
        $id = $this->como($g, $t)->postJson('/api/transporte/empresas', $dados)->assertCreated()->json('data.id');
        $this->como($g, $t)->deleteJson("/api/transporte/empresas/{$id}")->assertOk();
        $this->como($g, $t)->getJson('/api/transporte/empresas')->assertJsonCount(0, 'data');

        $this->como($g, $t)->postJson('/api/transporte/empresas', $dados)->assertCreated()->assertJsonPath('data.id', $id);
    }
}

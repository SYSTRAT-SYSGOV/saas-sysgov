<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Models\Motorista;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class MotoristasTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_motorista_elegivel_e_criado_ativo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $dados = $this->dadosMotorista(['nome' => 'João da Silva']);
        $r = $this->como($g, $t)->postJson('/api/transporte/motoristas', $dados)->assertCreated();

        $r->assertJsonPath('data.nome', 'João da Silva')->assertJsonPath('data.ativo', true)->assertJsonPath('data.elegivel', true)
            ->assertJsonPath('data.motivos_inelegibilidade', []);
        $this->assertNotNull($r->json('data.cpf_mascarado'));
        $this->assertStringNotContainsString($dados['cpf'], (string) $r->getContent(), 'o CPF completo não pode sair na resposta');
    }

    public function test_cnh_categoria_b_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista(['cnh_categoria' => 'B']))
            ->assertUnprocessable()->assertJsonValidationErrors(['cnh_categoria']);
        $this->como($g, $t)->getJson('/api/transporte/motoristas')->assertJsonCount(0, 'data');
    }

    public function test_cnh_categoria_em_minuscula_e_aceita(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista(['cnh_categoria' => 'e']))
            ->assertCreated()->assertJsonPath('data.cnh_categoria', 'E');
    }

    public function test_toxicologico_vencido_torna_inelegivel_e_aparece_como_motivo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarMotorista($t, $g);
        $this->noTenant($t, fn () => Motorista::findOrFail($id)->update(['toxicologico_validade' => now()->subDay()->toDateString()]));

        $this->como($g, $t)->getJson('/api/transporte/motoristas')->assertJsonPath('data.0.elegivel', false)
            ->assertJsonPath('data.0.motivos_inelegibilidade', ['toxicologico_vencido']);
        $this->como($g, $t)->getJson('/api/transporte/alertas')->assertJsonPath('data.0.tipo', 'toxicologico')->assertJsonPath('data.0.gravidade', 'critico');
    }

    public function test_motorista_inelegivel_nao_pode_ser_ativado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista(['curso_validade' => now()->subDay()->toDateString()]))
            ->assertUnprocessable()->assertJsonPath('error', fn (string $e): bool => str_contains($e, 'curso especializado vencido'));
    }

    public function test_motorista_inelegivel_pode_ser_cadastrado_inativo_e_nao_ativa_depois(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosMotorista(['cnh_validade' => now()->subDay()->toDateString(), 'ativo' => false]);
        $id = $this->como($g, $t)->postJson('/api/transporte/motoristas', $dados)->assertCreated()->assertJsonPath('data.elegivel', false)->json('data.id');
        $this->assertContains('cnh_vencida', $this->como($g, $t)->getJson('/api/transporte/motoristas')->json('data.0.motivos_inelegibilidade'));

        $this->como($g, $t)->putJson("/api/transporte/motoristas/{$id}", [...$dados, 'ativo' => true])->assertUnprocessable();
        // Renovada a CNH, ativa.
        $this->como($g, $t)->putJson("/api/transporte/motoristas/{$id}", [...$dados, 'ativo' => true, 'cnh_validade' => now()->addYear()->toDateString()])
            ->assertOk()->assertJsonPath('data.ativo', true);
    }

    public function test_menor_de_21_anos_nao_pode_ser_ativado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista(['data_nascimento' => now()->subYears(20)->toDateString()]))
            ->assertUnprocessable()->assertJsonPath('error', fn (string $e): bool => str_contains($e, 'idade mínima'));
    }

    public function test_exatamente_21_anos_ainda_nao_e_superior_a_21(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista(['data_nascimento' => now()->subYears(21)->toDateString()]))->assertUnprocessable();
        $this->como($g, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista(['data_nascimento' => now()->subYears(21)->subDay()->toDateString()]))->assertCreated();
    }

    public function test_pessoa_sem_data_de_nascimento_e_inelegivel(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosMotorista();
        unset($dados['data_nascimento']);

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $dados)->assertUnprocessable()
            ->assertJsonPath('error', fn (string $e): bool => str_contains($e, 'data de nascimento'));
    }

    public function test_mesma_pessoa_ou_mesma_cnh_dao_conflito(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosMotorista();
        $this->como($g, $t)->postJson('/api/transporte/motoristas', $dados)->assertCreated();

        $this->como($g, $t)->postJson('/api/transporte/motoristas', [...$dados, 'cnh_numero' => 'OUTRA123'])->assertConflict();
        $outro = $this->dadosMotorista(['cnh_numero' => $dados['cnh_numero']]);
        $this->como($g, $t)->postJson('/api/transporte/motoristas', $outro)->assertConflict();
    }

    public function test_motorista_padrao_de_veiculo_nao_e_excluido(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarMotorista($t, $g);
        $this->criarVeiculo($t, $g, ['motorista_padrao_id' => $id]);

        $this->como($g, $t)->deleteJson("/api/transporte/motoristas/{$id}")->assertConflict();
    }

    public function test_motorista_excluido_libera_cnh_e_pessoa(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosMotorista();
        $id = $this->como($g, $t)->postJson('/api/transporte/motoristas', $dados)->assertCreated()->json('data.id');
        $this->como($g, $t)->deleteJson("/api/transporte/motoristas/{$id}")->assertOk();

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $dados)->assertCreated()->assertJsonPath('data.id', $id);
    }

    public function test_motorista_vinculado_a_empresa_do_tenant(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $empresa = $this->criarEmpresa($t, $g);

        $this->como($g, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista(['empresa_id' => $empresa]))
            ->assertCreated()->assertJsonPath('data.empresa.id', $empresa);
    }
}

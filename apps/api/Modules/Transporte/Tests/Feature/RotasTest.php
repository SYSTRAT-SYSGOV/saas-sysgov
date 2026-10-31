<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class RotasTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_rota_e_criada_ativa_com_total_de_km_calculado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);

        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['horario_saida' => '06:30']))
            ->assertCreated()->assertJsonPath('data.ativa', true)->assertJsonPath('data.km_total', 19.75)
            ->assertJsonPath('data.turno_rotulo', 'Manhã')->assertJsonPath('data.horario_saida', '06:30')->assertJsonPath('data.escola.nome', $escola->nome)
            ->assertJsonPath('data.regular', true);
    }

    public function test_quilometragem_negativa_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);

        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['km_pavimentado' => -1]))
            ->assertUnprocessable()->assertJsonValidationErrors(['km_pavimentado']);
        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['km_nao_pavimentado' => -0.5]))
            ->assertUnprocessable()->assertJsonValidationErrors(['km_nao_pavimentado']);
    }

    public function test_escola_de_outro_tenant_e_recusada(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $g = $this->usuario($a, ['transporte_coordenacao']);
        $escolaB = $this->criarEscola($b);

        $this->como($g, $a)->postJson('/api/transporte/rotas', $this->dadosRota($a, $g, $escolaB))
            ->assertUnprocessable()->assertJsonValidationErrors(['escola_id']);
    }

    public function test_veiculo_com_vistoria_vencida_barra_a_rota(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->subDay()->toDateString(), now()->subMonths(7)->toDateString());

        $r = $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['veiculo_id' => $veiculo]))->assertStatus(409);
        $this->assertStringContainsString('vistoria vencida em ' . now()->subDay()->format('d/m/Y'), (string) $r->json('error'));
    }

    public function test_veiculo_sem_vistoria_e_veiculo_inativo_barram_a_rota(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $semVistoria = $this->criarVeiculo($t, $g);
        $inativo = $this->criarVeiculo($t, $g, ['ativo' => false, 'motivo_inativacao' => 'Baixado']);
        $this->registrarVistoria($t, $g, $inativo, now()->addMonths(5)->toDateString());

        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['veiculo_id' => $semVistoria]))->assertStatus(409);
        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['veiculo_id' => $inativo]))->assertStatus(409);
    }

    public function test_motorista_inelegivel_barra_a_rota(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $motorista = $this->criarMotorista($t, $g);
        \Illuminate\Support\Facades\DB::table('transporte_motoristas')->where('id', $motorista)->update(['toxicologico_validade' => now()->subDay()->toDateString()]);

        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['motorista_id' => $motorista]))->assertStatus(409);
    }

    public function test_contrato_vencido_da_empresa_da_rota_barra(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $empresa = $this->criarEmpresa($t, $g, ['vigencia_inicio' => now()->subYear()->toDateString(), 'vigencia_fim' => now()->subDay()->toDateString()]);

        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['empresa_id' => $empresa]))->assertStatus(409);
    }

    public function test_veiculo_locado_com_contrato_vencido_indica_a_locadora_e_a_data(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $locadora = $this->criarEmpresa($t, $g, ['tipo' => 'locadora', 'razao_social' => 'Locadora Sul Ltda']);
        $veiculo = $this->criarVeiculo($t, $g, ['origem' => 'locada', 'empresa_id' => $locadora]);
        $this->registrarVistoria($t, $g, $veiculo, now()->addMonths(5)->toDateString());

        // Vencimento simulado: o contrato venceu ontem.
        \Illuminate\Support\Facades\DB::table('transporte_empresas')->where('id', $locadora)->update(['vigencia_fim' => now()->subDay()->toDateString()]);

        $r = $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['veiculo_id' => $veiculo]))->assertStatus(409);
        $this->assertStringContainsString('Locadora Sul Ltda', (string) $r->json('error'));
        $this->assertStringContainsString(now()->subDay()->format('d/m/Y'), (string) $r->json('error'));
    }

    public function test_veiculo_proprio_sem_empresa_nao_tem_bloqueio_de_contrato(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->addMonths(5)->toDateString());
        $motorista = $this->criarMotorista($t, $g);

        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['veiculo_id' => $veiculo, 'motorista_id' => $motorista]))
            ->assertCreated()->assertJsonPath('data.empresa', null)->assertJsonPath('data.regular', true)->assertJsonPath('data.veiculo.id', $veiculo);
    }

    public function test_rota_que_ficou_irregular_e_sinalizada_sem_ser_alterada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->addDay()->toDateString());
        $rota = $this->criarRota($t, $g, $escola, ['veiculo_id' => $veiculo]);

        // A vistoria venceu ontem.
        \Illuminate\Support\Facades\DB::table('transporte_vistorias')->where('veiculo_id', $veiculo)->update(['validade' => now()->subDay()->toDateString()]);

        $this->como($g, $t)->getJson('/api/transporte/rotas')->assertJsonPath('data.0.regular', false)
            ->assertJsonPath('data.0.motivos_irregularidade', ['vistoria_vencida'])->assertJsonPath('data.0.ativa', true);
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$rota}")->assertJsonPath('data.motivos_irregularidade', ['vistoria_vencida']);
    }

    public function test_rota_irregular_pode_ser_renomeada_sem_trocar_o_veiculo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->addDay()->toDateString());
        $rota = $this->criarRota($t, $g, $escola, ['veiculo_id' => $veiculo]);
        \Illuminate\Support\Facades\DB::table('transporte_vistorias')->where('veiculo_id', $veiculo)->update(['validade' => now()->subDay()->toDateString()]);

        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}", $this->dadosRota($t, $g, $escola, ['veiculo_id' => $veiculo, 'nome' => 'Nome novo']))
            ->assertOk()->assertJsonPath('data.nome', 'Nome novo');
    }

    public function test_filtros_da_listagem_e_contagem_de_paradas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $e1 = $this->criarEscola($t, 'Escola Um');
        $e2 = $this->criarEscola($t, 'Escola Dois');
        $manha = $this->criarRota($t, $g, $e1, ['turno' => 'manha', 'ano_letivo' => 2026]);
        $this->criarRota($t, $g, $e1, ['turno' => 'tarde', 'ano_letivo' => 2026]);
        $this->criarRota($t, $g, $e2, ['turno' => 'manha', 'ano_letivo' => 2025, 'tipo_rede' => 'urbana', 'ativa' => false]);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$manha}/itinerario", ['parada_id' => $this->criarParada($t, $g)])->assertCreated();

        $this->como($g, $t)->getJson('/api/transporte/rotas?ano_letivo=2026&turno=manha')->assertJsonPath('total', 1)->assertJsonPath('data.0.paradas_count', 1);
        $this->como($g, $t)->getJson("/api/transporte/rotas?escola_id={$e2->id}")->assertJsonPath('total', 1);
        $this->como($g, $t)->getJson('/api/transporte/rotas?tipo_rede=urbana')->assertJsonPath('total', 1);
        $this->como($g, $t)->getJson('/api/transporte/rotas?situacao=inativa')->assertJsonPath('total', 1);
        $this->como($g, $t)->getJson('/api/transporte/rotas')->assertJsonPath('total', 3);
    }

    public function test_veiculo_empresa_e_motorista_em_rota_nao_podem_ser_excluidos(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->addMonths(5)->toDateString());
        $motorista = $this->criarMotorista($t, $g);
        $empresa = $this->criarEmpresa($t, $g);
        $rota = $this->criarRota($t, $g, $escola, ['veiculo_id' => $veiculo, 'motorista_id' => $motorista, 'empresa_id' => $empresa]);

        $this->como($g, $t)->deleteJson("/api/transporte/veiculos/{$veiculo}")->assertStatus(409);
        $this->como($g, $t)->deleteJson("/api/transporte/motoristas/{$motorista}")->assertStatus(409);
        $this->como($g, $t)->deleteJson("/api/transporte/empresas/{$empresa}")->assertStatus(409);

        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$rota}")->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/veiculos/{$veiculo}")->assertOk();
    }
}

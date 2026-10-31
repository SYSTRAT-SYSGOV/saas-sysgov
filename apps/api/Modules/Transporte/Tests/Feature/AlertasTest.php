<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class AlertasTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_sem_pendencias_a_lista_vem_vazia(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarMotorista($t, $g);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->addMonths(5)->toDateString());

        $this->como($g, $t)->getJson('/api/transporte/alertas')->assertOk()->assertJsonCount(0, 'data')
            ->assertJsonPath('resumo.criticos', 0)->assertJsonPath('resumo.atencao', 0);
    }

    public function test_cnh_a_vencer_em_30_dias_e_atencao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarMotorista($t, $g, ['cnh_validade' => now()->addDays(12)->toDateString()]);

        $r = $this->como($g, $t)->getJson('/api/transporte/alertas')->assertJsonCount(1, 'data');
        $r->assertJsonPath('data.0.tipo', 'cnh')->assertJsonPath('data.0.gravidade', 'atencao')->assertJsonPath('data.0.dias', 12)
            ->assertJsonPath('data.0.data', now()->addDays(12)->toDateString())->assertJsonPath('resumo.atencao', 1);
    }

    public function test_limite_de_30_dias(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarMotorista($t, $g, ['cnh_validade' => now()->addDays(30)->toDateString()]);
        $this->criarMotorista($t, $g, ['cnh_validade' => now()->addDays(31)->toDateString()]);

        $this->como($g, $t)->getJson('/api/transporte/alertas')->assertJsonCount(1, 'data')->assertJsonPath('data.0.dias', 30);
    }

    public function test_vistoria_vencida_e_critica_e_vem_antes_da_de_atencao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarMotorista($t, $g, ['cnh_validade' => now()->addDays(5)->toDateString()]);
        $veiculo = $this->criarVeiculo($t, $g, ['placa' => 'VEN1A23']);
        $this->registrarVistoria($t, $g, $veiculo, now()->subDays(3)->toDateString(), now()->subMonths(7)->toDateString());

        $r = $this->como($g, $t)->getJson('/api/transporte/alertas')->assertJsonCount(2, 'data');
        $r->assertJsonPath('data.0.tipo', 'vistoria')->assertJsonPath('data.0.gravidade', 'critico')->assertJsonPath('data.0.item', 'VEN1A23')
            ->assertJsonPath('data.1.tipo', 'cnh')->assertJsonPath('resumo.criticos', 1);
    }

    public function test_itens_inativos_nao_geram_alerta(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $veiculo = $this->criarVeiculo($t, $g, ['ativo' => false, 'motivo_inativacao' => 'Baixado']);
        $this->registrarVistoria($t, $g, $veiculo, now()->subDays(3)->toDateString(), now()->subMonths(7)->toDateString());
        $this->criarMotorista($t, $g, ['cnh_validade' => now()->subDay()->toDateString(), 'ativo' => false]);
        $this->criarEmpresa($t, $g, ['vigencia_inicio' => now()->subYear()->toDateString(), 'vigencia_fim' => now()->subDay()->toDateString(), 'ativa' => false]);

        $this->como($g, $t)->getJson('/api/transporte/alertas')->assertJsonCount(0, 'data');
    }

    public function test_curso_e_toxicologico_tambem_geram_alerta(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarMotorista($t, $g, ['curso_validade' => now()->addDays(10)->toDateString(), 'toxicologico_validade' => now()->addDays(20)->toDateString()]);

        $tipos = array_column($this->como($g, $t)->getJson('/api/transporte/alertas')->json('data'), 'tipo');
        $this->assertSame(['curso', 'toxicologico'], $tipos);
    }
}

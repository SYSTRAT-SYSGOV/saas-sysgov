<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class VistoriasTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_veiculo_sem_vistoria_nao_e_regular(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarVeiculo($t, $g);

        $this->como($g, $t)->getJson('/api/transporte/veiculos')->assertJsonPath('data.0.regular', false)
            ->assertJsonPath('data.0.motivos_irregularidade', ['sem_vistoria'])->assertJsonPath('data.0.vistoria_validade', null);
    }

    public function test_vistoria_nova_torna_regular_e_o_historico_e_preservado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $id, now()->subDay()->toDateString(), now()->subMonths(7)->toDateString());
        $this->como($g, $t)->getJson('/api/transporte/veiculos')->assertJsonPath('data.0.motivos_irregularidade', ['vistoria_vencida']);

        $this->registrarVistoria($t, $g, $id, now()->addMonths(5)->toDateString(), now()->subDay()->toDateString());

        $this->como($g, $t)->getJson('/api/transporte/veiculos')->assertJsonPath('data.0.regular', true)
            ->assertJsonPath('data.0.vistoria_validade', now()->addMonths(5)->toDateString());
        $historico = $this->como($g, $t)->getJson("/api/transporte/veiculos/{$id}/vistorias")->assertOk()->assertJsonCount(2, 'data');
        $this->assertTrue($historico->json('data.0.vigente'));
        $this->assertFalse($historico->json('data.1.vigente'));
    }

    public function test_validade_anterior_a_data_da_vistoria_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarVeiculo($t, $g);

        $this->como($g, $t)->postJson("/api/transporte/veiculos/{$id}/vistorias", [
            'data_vistoria' => now()->toDateString(), 'certificado' => 'X1', 'validade' => now()->subDay()->toDateString(),
        ])->assertUnprocessable()->assertJsonValidationErrors(['validade']);
    }

    public function test_vistoria_exige_permissao_de_frota(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarVeiculo($t, $g);

        $this->como($this->usuario($t, ['transporte_consulta']), $t)->postJson("/api/transporte/veiculos/{$id}/vistorias", [
            'data_vistoria' => now()->toDateString(), 'certificado' => 'X1', 'validade' => now()->addMonths(6)->toDateString(),
        ])->assertForbidden();
    }

    public function test_veiculo_inativo_e_irregular_mesmo_com_vistoria(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarVeiculo($t, $g, ['ativo' => false, 'motivo_inativacao' => 'Baixado']);
        $this->registrarVistoria($t, $g, $id, now()->addMonths(5)->toDateString());

        $this->como($g, $t)->getJson('/api/transporte/veiculos')->assertJsonPath('data.0.motivos_irregularidade', ['inativo']);
    }
}

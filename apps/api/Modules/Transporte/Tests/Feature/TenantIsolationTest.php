<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_dados_de_um_tenant_nao_aparecem_no_outro(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gestorA = $this->usuario($a, ['transporte_coordenacao']);
        $gestorB = $this->usuario($b, ['transporte_coordenacao']);
        $empresa = $this->criarEmpresa($a, $gestorA);
        $motorista = $this->criarMotorista($a, $gestorA);
        $veiculo = $this->criarVeiculo($a, $gestorA);
        $this->criarVeiculo($a, $gestorA);
        $this->criarVeiculo($a, $gestorA);
        $this->criarVeiculo($b, $gestorB);
        $this->criarVeiculo($b, $gestorB);

        $this->como($gestorB, $b)->getJson('/api/transporte/veiculos')->assertOk()->assertJsonCount(2, 'data');
        $this->como($gestorA, $a)->getJson('/api/transporte/veiculos')->assertOk()->assertJsonCount(3, 'data');
        $this->como($gestorB, $b)->getJson('/api/transporte/empresas')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gestorB, $b)->getJson('/api/transporte/motoristas')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gestorB, $b)->putJson("/api/transporte/veiculos/{$veiculo}", $this->dadosVeiculo())->assertNotFound();
        $this->como($gestorB, $b)->deleteJson("/api/transporte/empresas/{$empresa}")->assertNotFound();
        $this->como($gestorB, $b)->deleteJson("/api/transporte/motoristas/{$motorista}")->assertNotFound();
        $this->como($gestorB, $b)->getJson("/api/transporte/veiculos/{$veiculo}/vistorias")->assertNotFound();
    }

    public function test_nao_aceita_referencias_de_outro_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gestorA = $this->usuario($a, ['transporte_coordenacao']);
        $gestorB = $this->usuario($b, ['transporte_coordenacao']);
        $empresaB = $this->criarEmpresa($b, $gestorB, ['tipo' => 'locadora']);
        $motoristaB = $this->criarMotorista($b, $gestorB);

        $this->como($gestorA, $a)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['origem' => 'locada', 'empresa_id' => $empresaB]))
            ->assertUnprocessable()->assertJsonValidationErrors(['empresa_id']);
        $this->como($gestorA, $a)->postJson('/api/transporte/veiculos', $this->dadosVeiculo(['motorista_padrao_id' => $motoristaB]))
            ->assertUnprocessable()->assertJsonValidationErrors(['motorista_padrao_id']);
    }

    public function test_alertas_e_auditoria_sao_do_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gestorA = $this->usuario($a, ['transporte_coordenacao']);
        $gestorB = $this->usuario($b, ['transporte_coordenacao']);
        $this->criarMotorista($a, $gestorA, ['cnh_validade' => now()->subDay()->toDateString(), 'ativo' => false]);
        $this->criarVeiculo($a, $gestorA);

        $this->como($gestorB, $b)->getJson('/api/transporte/auditoria')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gestorB, $b)->getJson('/api/transporte/alertas')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_modulo_desabilitado_bloqueia_acesso(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $gestor = $this->usuario($a, ['transporte_coordenacao']);
        \Modules\Admin\Models\Module::where('alias', 'transporte')->firstOrFail()->tenants()->updateExistingPivot($a->id, ['enabled' => false]);

        $this->como($gestor, $a)->getJson('/api/transporte/opcoes')->assertForbidden();
    }

    public function test_criar_sem_tenant_no_contexto_falha(): void
    {
        $this->expectException(LogicException::class);

        Veiculo::create([
            'origem' => 'propria', 'descricao' => 'Sem tenant', 'placa' => 'ZZZ9999', 'capacidade' => 10, 'tipo_rede' => 'rural', 'tipologia_inep' => 3,
        ]);
    }
}

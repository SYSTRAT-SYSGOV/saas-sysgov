<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Database\Seeders\TransporteRbacSeeder;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class PermissoesEAuditoriaTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_consulta_le_mas_nao_escreve(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $veiculo = $this->criarVeiculo($t, $g);

        $this->como($consulta, $t)->getJson('/api/transporte/veiculos')->assertOk();
        $this->como($consulta, $t)->getJson('/api/transporte/empresas')->assertOk();
        $this->como($consulta, $t)->getJson('/api/transporte/alertas')->assertOk();
        $this->como($consulta, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo())->assertForbidden();
        $this->como($consulta, $t)->putJson("/api/transporte/veiculos/{$veiculo}", $this->dadosVeiculo())->assertForbidden();
        $this->como($consulta, $t)->deleteJson("/api/transporte/veiculos/{$veiculo}")->assertForbidden();
        $this->como($consulta, $t)->postJson('/api/transporte/empresas', $this->dadosEmpresa())->assertForbidden();
        $this->como($consulta, $t)->postJson('/api/transporte/motoristas', $this->dadosMotorista())->assertForbidden();
    }

    public function test_usuario_sem_perfil_do_modulo_e_barrado(): void
    {
        $t = $this->criarTenant();
        $semPerfil = $this->usuario($t, []);

        $this->como($semPerfil, $t)->getJson('/api/transporte/veiculos')->assertForbidden();
        $this->como($semPerfil, $t)->getJson('/api/transporte/opcoes')->assertForbidden();
    }

    public function test_operador_gere_a_frota_mas_nao_ve_a_auditoria(): void
    {
        $t = $this->criarTenant();
        $operador = $this->usuario($t, ['transporte_operador']);

        $this->como($operador, $t)->postJson('/api/transporte/veiculos', $this->dadosVeiculo())->assertCreated();
        $this->como($operador, $t)->getJson('/api/transporte/auditoria')->assertForbidden();
    }

    public function test_seeder_e_idempotente_e_cria_os_tres_perfis(): void
    {
        $this->criarTenant();
        (new TransporteRbacSeeder())->run();
        (new TransporteRbacSeeder())->run();

        $this->assertSame(7, Permission::where('module', 'transporte')->count());
        $this->assertSame(array_keys(TransporteRbacSeeder::PERMISSOES), Permission::where('module', 'transporte')->orderBy('id')->pluck('slug')->all());
        $sistema = \App\Models\Tenant::where('slug', 'systrat')->value('id');
        $this->assertSame(array_keys(TransporteRbacSeeder::PERFIS), \App\Models\Role::where('module', 'transporte')->where('tenant_id', $sistema)->orderBy('id')->pluck('slug')->all());
    }

    public function test_edicao_e_auditada_com_antes_e_depois(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $dados = $this->dadosVeiculo(['capacidade' => 20]);
        $id = $this->como($g, $t)->postJson('/api/transporte/veiculos', $dados)->assertCreated()->json('data.id');
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$id}", [...$dados, 'capacidade' => 24])->assertOk();

        $r = $this->como($g, $t)->getJson('/api/transporte/auditoria?acao=veiculo.alterado')->assertOk()->assertJsonCount(1, 'data');
        $r->assertJsonPath('data.0.antes.capacidade', 20)->assertJsonPath('data.0.depois.capacidade', 24)->assertJsonPath('data.0.recurso', "veiculo:{$id}");
        $this->assertNotNull($r->json('data.0.usuario'));
    }

    public function test_toda_mutacao_gera_auditoria(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $empresa = $this->criarEmpresa($t, $g, ['tipo' => 'locadora']);
        $motorista = $this->criarMotorista($t, $g);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->addMonths(5)->toDateString());
        $this->como($g, $t)->deleteJson("/api/transporte/veiculos/{$veiculo}")->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/motoristas/{$motorista}")->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/empresas/{$empresa}")->assertOk();

        $acoes = AuditLog::query()->where('tenant_id', $t->id)->where('module', 'transporte')->pluck('action')->all();
        foreach (['empresa.criada', 'motorista.criado', 'veiculo.criado', 'vistoria.registrada', 'veiculo.excluido', 'motorista.excluido', 'empresa.excluida'] as $esperada) {
            $this->assertContains($esperada, $acoes);
        }
    }

    public function test_consulta_de_auditoria_pede_a_permissao_audit(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->como($g, $t)->getJson('/api/transporte/auditoria')->assertOk();

        $this->como($this->usuario($t, ['transporte_consulta']), $t)->getJson('/api/transporte/auditoria')->assertForbidden();
    }
}

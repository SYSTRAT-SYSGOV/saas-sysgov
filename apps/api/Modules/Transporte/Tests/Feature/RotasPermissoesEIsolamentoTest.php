<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class RotasPermissoesEIsolamentoTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_paradas_rotas_e_itinerarios_sao_do_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $parada = $this->criarParada($a, $gA);
        $rota = $this->criarRota($a, $gA, $this->criarEscola($a));
        $this->como($gA, $a)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $parada])->assertCreated();

        $this->como($gB, $b)->getJson('/api/transporte/paradas')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gB, $b)->getJson('/api/transporte/rotas')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gB, $b)->getJson("/api/transporte/rotas/{$rota}")->assertNotFound();
        $this->como($gB, $b)->getJson("/api/transporte/rotas/{$rota}/itinerario")->assertNotFound();
        $this->como($gB, $b)->putJson("/api/transporte/paradas/{$parada}", ['nome' => 'X'])->assertNotFound();
        $this->como($gB, $b)->deleteJson("/api/transporte/rotas/{$rota}")->assertNotFound();
    }

    public function test_itinerario_nao_aceita_parada_de_outro_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $paradaB = $this->criarParada($b, $gB);
        $rota = $this->criarRota($a, $gA, $this->criarEscola($a));

        $this->como($gA, $a)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $paradaB])
            ->assertUnprocessable()->assertJsonValidationErrors(['parada_id']);
    }

    public function test_rota_nao_aceita_veiculo_ou_motorista_de_outro_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $veiculoB = $this->criarVeiculo($b, $gB);
        $motoristaB = $this->criarMotorista($b, $gB);
        $escola = $this->criarEscola($a);

        $this->como($gA, $a)->postJson('/api/transporte/rotas', $this->dadosRota($a, $gA, $escola, ['veiculo_id' => $veiculoB]))
            ->assertUnprocessable()->assertJsonValidationErrors(['veiculo_id']);
        $this->como($gA, $a)->postJson('/api/transporte/rotas', $this->dadosRota($a, $gA, $escola, ['motorista_id' => $motoristaB]))
            ->assertUnprocessable()->assertJsonValidationErrors(['motorista_id']);
    }

    public function test_quem_so_gere_a_frota_nao_cria_rota_nem_parada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $parada = $this->criarParada($t, $g);
        $soFrota = $this->usuario($t, []);
        // Perfil só com frota.manage + view, montado a partir do operador sem rotas.manage.
        $perfil = \App\Models\Role::where('slug', 'transporte_operador')->where('tenant_id', $t->id)->firstOrFail();
        $idRotas = (int) $perfil->permissions()->where('slug', 'transporte.rotas.manage')->value('permissions.id');
        $this->assertGreaterThan(0, $idRotas);
        $perfil->permissions()->detach($idRotas);
        $soFrota->roles()->attach($perfil->id, ['tenant_id' => $t->id]);
        $soFrota->clearPermissionCache();

        $this->como($soFrota, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $soFrota, $this->criarEscola($t, 'Outra')))->assertForbidden();
        $this->como($soFrota, $t)->postJson('/api/transporte/paradas', ['nome' => 'X'])->assertForbidden();
        $this->como($soFrota, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $parada])->assertForbidden();
        $this->como($soFrota, $t)->getJson('/api/transporte/rotas')->assertOk();
    }

    public function test_consulta_le_mas_nao_escreve_rotas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $rota = $this->criarRota($t, $g, $escola);
        $parada = $this->criarParada($t, $g);
        $c = $this->usuario($t, ['transporte_consulta']);

        $this->como($c, $t)->getJson('/api/transporte/rotas')->assertOk();
        $this->como($c, $t)->getJson('/api/transporte/paradas')->assertOk();
        $this->como($c, $t)->getJson("/api/transporte/rotas/{$rota}/itinerario")->assertOk();
        $this->como($c, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $c, $escola))->assertForbidden();
        $this->como($c, $t)->putJson("/api/transporte/rotas/{$rota}", $this->dadosRota($t, $c, $escola))->assertForbidden();
        $this->como($c, $t)->deleteJson("/api/transporte/rotas/{$rota}")->assertForbidden();
        $this->como($c, $t)->postJson('/api/transporte/paradas', ['nome' => 'X'])->assertForbidden();
        $this->como($c, $t)->deleteJson("/api/transporte/paradas/{$parada}")->assertForbidden();
        $this->como($c, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario", ['paradas' => []])->assertForbidden();
    }

    public function test_opcoes_trazem_escolas_anos_turnos_e_a_permissao_de_rotas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarEscola($t);
        $c = $this->usuario($t, ['transporte_consulta']);

        $r = $this->como($g, $t)->getJson('/api/transporte/opcoes')->assertOk();
        $r->assertJsonPath('data.permissoes.gerenciar_rotas', true)->assertJsonCount(4, 'data.turnos')->assertJsonCount(1, 'data.escolas');
        $this->assertContains((int) now()->year, $r->json('data.anos_letivos'));
        $this->como($c, $t)->getJson('/api/transporte/opcoes')->assertJsonPath('data.permissoes.gerenciar_rotas', false);
    }

    public function test_toda_mutacao_de_rotas_gera_auditoria(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $a = $this->criarParada($t, $g);
        $b = $this->criarParada($t, $g);
        $livre = $this->criarParada($t, $g);
        foreach ([$a, $b] as $id) {
            $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $id])->assertCreated();
        }
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario/{$a}", ['embarque_previsto' => '07:00'])->assertOk();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario", ['paradas' => [$b, $a]])->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$rota}/itinerario/{$a}")->assertOk();
        $this->como($g, $t)->putJson("/api/transporte/paradas/{$livre}", ['nome' => 'Nova'])->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/paradas/{$livre}")->assertOk();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}", $this->dadosRota($t, $g, \Modules\Escola\Models\Escola::query()->firstOrFail()))->assertOk();
        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$rota}")->assertOk();

        $acoes = AuditLog::query()->where('tenant_id', $t->id)->where('module', 'transporte')->pluck('action')->all();
        foreach ([
            'rota.criada', 'rota.alterada', 'rota.excluida', 'parada.criada', 'parada.alterada', 'parada.excluida',
            'itinerario.parada_adicionada', 'itinerario.horarios_alterados', 'itinerario.reordenado', 'itinerario.parada_removida',
        ] as $esperada) {
            $this->assertContains($esperada, $acoes);
        }
    }
}

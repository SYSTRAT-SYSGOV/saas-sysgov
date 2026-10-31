<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class ItinerarioTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_parada_entra_no_fim_do_itinerario(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        foreach (range(1, 3) as $_) {
            $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $this->criarParada($t, $g)])->assertCreated();
        }

        $nova = $this->criarParada($t, $g);
        $r = $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $nova, 'embarque_previsto' => '06:40', 'desembarque_previsto' => '06:45'])->assertCreated();

        $r->assertJsonCount(4, 'data')->assertJsonPath('data.3.ordem', 4)->assertJsonPath('data.3.parada.id', $nova)->assertJsonPath('data.3.embarque_previsto', '06:40');
    }

    public function test_parada_repetida_e_recusada_e_o_itinerario_e_mantido(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $parada = $this->criarParada($t, $g);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $parada])->assertCreated();

        $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $parada])->assertStatus(409);
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$rota}/itinerario")->assertJsonCount(1, 'data');
    }

    public function test_parada_inativa_nao_entra(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $parada = $this->criarParada($t, $g, ['ativa' => false]);

        $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $parada])->assertUnprocessable();
    }

    public function test_reordenacao_grava_a_nova_ordem_de_uma_vez(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $ids = [];
        foreach (range(1, 4) as $_) {
            $ids[] = $this->criarParada($t, $g);
            $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => end($ids)])->assertCreated();
        }
        $nova = [$ids[3], $ids[0], $ids[2], $ids[1]];

        $r = $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario", ['paradas' => $nova])->assertOk();

        $this->assertSame($nova, array_column(array_column($r->json('data'), 'parada'), 'id'));
        $this->assertSame([1, 2, 3, 4], array_column($r->json('data'), 'ordem'));
    }

    public function test_reordenacao_com_parada_de_fora_ou_incompleta_e_recusada_e_mantem_a_ordem(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $a = $this->criarParada($t, $g);
        $b = $this->criarParada($t, $g);
        $fora = $this->criarParada($t, $g);
        foreach ([$a, $b] as $id) {
            $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $id])->assertCreated();
        }

        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario", ['paradas' => [$b, $fora]])->assertUnprocessable();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario", ['paradas' => [$b]])->assertUnprocessable();
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario", ['paradas' => [$b, $b]])->assertUnprocessable();

        $atual = $this->como($g, $t)->getJson("/api/transporte/rotas/{$rota}/itinerario")->json('data');
        $this->assertSame([$a, $b], array_column(array_column($atual, 'parada'), 'id'));
    }

    public function test_remocao_renumera_sem_lacuna(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $ids = [];
        foreach (range(1, 4) as $_) {
            $ids[] = $this->criarParada($t, $g);
            $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => end($ids)])->assertCreated();
        }

        $r = $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$rota}/itinerario/{$ids[1]}")->assertOk();

        $this->assertSame([$ids[0], $ids[2], $ids[3]], array_column(array_column($r->json('data'), 'parada'), 'id'));
        $this->assertSame([1, 2, 3], array_column($r->json('data'), 'ordem'));
        $this->como($g, $t)->deleteJson("/api/transporte/rotas/{$rota}/itinerario/{$ids[1]}")->assertUnprocessable();
    }

    public function test_horarios_da_parada_podem_ser_alterados(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $parada = $this->criarParada($t, $g);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $parada])->assertCreated();

        $this->como($g, $t)->putJson("/api/transporte/rotas/{$rota}/itinerario/{$parada}", ['embarque_previsto' => '07:05', 'desembarque_previsto' => null])
            ->assertOk()->assertJsonPath('data.0.embarque_previsto', '07:05')->assertJsonPath('data.0.desembarque_previsto', null);
    }

    public function test_paradas_de_rotas_diferentes_nao_se_misturam(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $r1 = $this->criarRota($t, $g, $escola);
        $r2 = $this->criarRota($t, $g, $escola);
        $p1 = $this->criarParada($t, $g);
        $p2 = $this->criarParada($t, $g);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r1}/itinerario", ['parada_id' => $p1])->assertCreated();
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r2}/itinerario", ['parada_id' => $p2])->assertCreated();
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$r2}/itinerario", ['parada_id' => $p1])->assertCreated();

        $this->como($g, $t)->getJson("/api/transporte/rotas/{$r1}/itinerario")->assertJsonCount(1, 'data')->assertJsonPath('data.0.parada.id', $p1);
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$r2}/itinerario")->assertJsonCount(2, 'data')->assertJsonPath('data.0.parada.id', $p2)->assertJsonPath('data.1.ordem', 2);
    }
}

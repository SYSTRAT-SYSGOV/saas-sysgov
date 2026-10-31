<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class ParadasTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_parada_com_coordenadas_validas_e_criada_e_aparece_na_lista(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/paradas', ['nome' => 'Ponto da escola', 'latitude' => -25.43, 'longitude' => -49.27, 'cep' => '80000-000', 'uf' => 'pr'])
            ->assertCreated()->assertJsonPath('data.tem_coordenadas', true)->assertJsonPath('data.cep', '80000000')->assertJsonPath('data.uf', 'PR');

        $this->como($g, $t)->getJson('/api/transporte/paradas')->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.nome', 'Ponto da escola');
    }

    public function test_parada_sem_coordenadas_e_aceita(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/paradas', ['nome' => 'Sem GPS'])->assertCreated()
            ->assertJsonPath('data.tem_coordenadas', false)->assertJsonPath('data.latitude', null);
    }

    public function test_latitude_fora_da_faixa_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/paradas', ['nome' => 'X', 'latitude' => 120, 'longitude' => -49])
            ->assertUnprocessable()->assertJsonValidationErrors(['latitude']);
        $this->como($g, $t)->postJson('/api/transporte/paradas', ['nome' => 'X', 'latitude' => -25, 'longitude' => 181])
            ->assertUnprocessable()->assertJsonValidationErrors(['longitude']);
    }

    public function test_so_uma_coordenada_e_recusada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->como($g, $t)->postJson('/api/transporte/paradas', ['nome' => 'X', 'latitude' => -25.4])
            ->assertUnprocessable()->assertJsonValidationErrors(['longitude']);
        $this->como($g, $t)->postJson('/api/transporte/paradas', ['nome' => 'X', 'longitude' => -49.2])
            ->assertUnprocessable()->assertJsonValidationErrors(['latitude']);
    }

    public function test_parada_pode_ser_alterada_e_inativada(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->criarParada($t, $g);

        $this->como($g, $t)->putJson("/api/transporte/paradas/{$id}", ['nome' => 'Renomeada', 'ativa' => false])
            ->assertOk()->assertJsonPath('data.nome', 'Renomeada')->assertJsonPath('data.ativa', false);
        $this->como($g, $t)->getJson('/api/transporte/paradas?ativa=1')->assertJsonPath('total', 0);
    }

    public function test_busca_por_nome(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarParada($t, $g, ['nome' => 'Ponte do Rio']);
        $this->criarParada($t, $g, ['nome' => 'Escola Velha']);

        $this->como($g, $t)->getJson('/api/transporte/paradas?q=Ponte')->assertJsonPath('total', 1);
    }

    public function test_parada_em_itinerario_nao_pode_ser_excluida(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));
        $parada = $this->criarParada($t, $g);
        $this->como($g, $t)->postJson("/api/transporte/rotas/{$rota}/itinerario", ['parada_id' => $parada])->assertCreated();

        $this->como($g, $t)->deleteJson("/api/transporte/paradas/{$parada}")->assertStatus(409);

        $livre = $this->criarParada($t, $g);
        $this->como($g, $t)->deleteJson("/api/transporte/paradas/{$livre}")->assertOk();
    }
}

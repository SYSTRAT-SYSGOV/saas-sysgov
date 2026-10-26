<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/inventario — cadastros (RF-01..RF-03). */
final class InventarioTest extends CemiteriosTestCase
{
    public function test_codigo_de_cemiterio_e_unico_no_municipio_mas_nao_entre_municipios(): void
    {
        $a = $this->criarTenant('pref-a');
        $b = $this->criarTenant('pref-b');
        $payload = ['codigo' => 'CEM-01', 'nome' => 'Cemitério Central'];

        $this->como($this->admin($a), $a)->postJson('/api/cemiterios/parques', $payload)->assertCreated();
        $this->como($this->admin($a), $a)->postJson('/api/cemiterios/parques', $payload)->assertUnprocessable();
        $this->como($this->admin($b), $b)->postJson('/api/cemiterios/parques', $payload)->assertCreated();
    }

    public function test_setor_em_cemiterio_de_outro_tenant_responde_404(): void
    {
        $a = $this->criarTenant('pref-a');
        $b = $this->criarTenant('pref-b');

        $parqueA = $this->como($this->admin($a), $a)->postJson('/api/cemiterios/parques', ['codigo' => 'C1', 'nome' => 'A'])->json('id');

        $this->como($this->admin($b), $b)
            ->postJson("/api/cemiterios/parques/{$parqueA}/setores", ['codigo' => 'Q1', 'tipo_zona' => 'jazigos'])
            ->assertNotFound();
    }

    public function test_jazigo_com_capacidade_zero_e_rejeitado(): void
    {
        [$t, $admin, $setor] = $this->cenario();

        $this->como($admin, $t)
            ->postJson('/api/cemiterios/jazigos', ['sector_id' => $setor, 'codigo' => 'J1', 'tipo' => 'jazigo', 'capacidade' => 0])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('capacidade');
    }

    public function test_cemiterio_com_jazigo_ocupado_nao_pode_ser_excluido(): void
    {
        [$t, $admin, $setor, $parque] = $this->cenario();
        $jazigoId = $this->como($admin, $t)
            ->postJson('/api/cemiterios/jazigos', ['sector_id' => $setor, 'codigo' => 'J1', 'tipo' => 'jazigo', 'capacidade' => 2])
            ->assertCreated()
            ->assertJsonPath('estado', 'disponivel')
            ->json('id');

        $this->noTenant($t);
        app(JazigoEstadoService::class)->alterarOcupacao(Jazigo::findOrFail($jazigoId), 1, 'teste');

        $this->como($admin, $t)->deleteJson("/api/cemiterios/parques/{$parque}")
            ->assertUnprocessable()
            ->assertJsonPath('code', 'parque.com_jazigos_ocupados');
    }

    public function test_lista_de_cemiterios_traz_capacidade_e_ocupacao_atuais(): void
    {
        [$t, $admin, $setor, $parque] = $this->cenario();
        $vazio = $this->como($admin, $t)->postJson('/api/cemiterios/parques', ['codigo' => 'C2', 'nome' => 'Sem jazigos'])->json('id');

        $jazigoId = $this->como($admin, $t)
            ->postJson('/api/cemiterios/jazigos', ['sector_id' => $setor, 'codigo' => 'J1', 'tipo' => 'jazigo', 'capacidade' => 4])
            ->assertCreated()->json('id');
        $this->como($admin, $t)
            ->postJson('/api/cemiterios/jazigos', ['sector_id' => $setor, 'codigo' => 'J2', 'tipo' => 'jazigo', 'capacidade' => 2])
            ->assertCreated();

        /** @return array<int, array<string, mixed>> lista de cemitérios indexada pelo id */
        $listar = function () use ($admin, $t): array {
            /** @var list<array<string, mixed>> $lista */
            $lista = $this->como($admin, $t)->getJson('/api/cemiterios/parques')->assertOk()->json();

            return array_column($lista, null, 'id');
        };

        $antes = $listar();
        $this->assertSame(6, $antes[$parque]['capacidade_total']);
        $this->assertSame(0, $antes[$parque]['ocupacao_total']);
        $this->assertSame(0, $antes[$vazio]['capacidade_total']);

        // O sepultamento muda a ocupação sem limpar o cache da lista: a taxa tem de acompanhar na próxima leitura.
        $this->noTenant($t);
        app(JazigoEstadoService::class)->alterarOcupacao(Jazigo::findOrFail($jazigoId), 1, 'teste');

        $depois = $listar();
        $this->assertSame(6, $depois[$parque]['capacidade_total']);
        $this->assertSame(1, $depois[$parque]['ocupacao_total']);
    }

    /** @return array{0: Tenant, 1: User, 2: int, 3: int} */
    private function cenario(): array
    {
        $t = $this->criarTenant();
        $admin = $this->admin($t);
        $parque = $this->como($admin, $t)->postJson('/api/cemiterios/parques', ['codigo' => 'C1', 'nome' => 'Central'])->json('id');
        $setor = $this->como($admin, $t)->postJson("/api/cemiterios/parques/{$parque}/setores", ['codigo' => 'Q1', 'tipo_zona' => 'jazigos'])->json('id');

        return [$t, $admin, $setor, $parque];
    }
}

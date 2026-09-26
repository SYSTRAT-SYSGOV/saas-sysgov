<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Guia;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

final class InventarioFiltrosAvancadosTest extends CemiteriosTestCase
{
    public function test_filtros_avancados_de_ocupacao_e_georreferenciamento(): void
    {
        [$t, $admin, $setor] = $this->cenario();

        $this->noTenant($t);
        $j1 = new Jazigo([
            'park_id' => 1,
            'sector_id' => $setor,
            'codigo' => 'J-VAZIO-GPS',
            'tipo' => 'jazigo',
            'capacidade' => 3,
            'lat' => -25.5321,
            'lng' => -49.1234,
        ]);
        $j1->forceFill(['tenant_id' => $t->id, 'ocupacao' => 0])->save();

        $j2 = new Jazigo([
            'park_id' => 1,
            'sector_id' => $setor,
            'codigo' => 'J-LOTADO-SEMGPS',
            'tipo' => 'jazigo',
            'capacidade' => 2,
            'lat' => null,
            'lng' => null,
        ]);
        $j2->forceFill(['tenant_id' => $t->id, 'ocupacao' => 2])->save();

        // Filtro ocupação vazio
        $resVazio = $this->como($admin, $t)->getJson('/api/cemiterios/jazigos?faixa_ocupacao=vazio')->assertOk();
        $codigosVazio = collect((array) $resVazio->json('data'))->pluck('codigo');
        $this->assertTrue($codigosVazio->contains('J-VAZIO-GPS'));
        $this->assertFalse($codigosVazio->contains('J-LOTADO-SEMGPS'));

        // Filtro ocupação lotado
        $resLotado = $this->como($admin, $t)->getJson('/api/cemiterios/jazigos?faixa_ocupacao=lotado')->assertOk();
        $codigosLotado = collect((array) $resLotado->json('data'))->pluck('codigo');
        $this->assertTrue($codigosLotado->contains('J-LOTADO-SEMGPS'));
        $this->assertFalse($codigosLotado->contains('J-VAZIO-GPS'));

        // Filtro georreferenciado
        $resComGps = $this->como($admin, $t)->getJson('/api/cemiterios/jazigos?georreferenciado=com_gps')->assertOk();
        $codigosComGps = collect((array) $resComGps->json('data'))->pluck('codigo');
        $this->assertTrue($codigosComGps->contains('J-VAZIO-GPS'));
        $this->assertFalse($codigosComGps->contains('J-LOTADO-SEMGPS'));

        $resSemGps = $this->como($admin, $t)->getJson('/api/cemiterios/jazigos?georreferenciado=sem_gps')->assertOk();
        $codigosSemGps = collect((array) $resSemGps->json('data'))->pluck('codigo');
        $this->assertTrue($codigosSemGps->contains('J-LOTADO-SEMGPS'));
        $this->assertFalse($codigosSemGps->contains('J-VAZIO-GPS'));
    }

    public function test_filtro_por_concessao_e_consulta_de_guias_por_jazigo(): void
    {
        [$t, $admin, $setor, $parque] = $this->cenario();
        $this->noTenant($t);

        $jComConc = Jazigo::create([
            'park_id' => $parque,
            'sector_id' => $setor,
            'codigo' => 'J-CONC-01',
            'tipo' => 'jazigo',
            'capacidade' => 3,
        ]);

        $jSemConc = Jazigo::create([
            'park_id' => $parque,
            'sector_id' => $setor,
            'codigo' => 'J-SEM-CONC',
            'tipo' => 'jazigo',
            'capacidade' => 3,
        ]);

        $titular = Concessionario::create([
            'nome' => 'José da Silva',
            'documento' => '12345678900',
            'tipo_doc' => 'cpf',
        ]);

        $concessao = Concessao::create([
            'numero' => 'TERMO-999/2026',
            'plot_id' => $jComConc->id,
            'holder_id' => $titular->id,
            'modalidade' => 'perpetua',
            'inicio' => today(),
            'situacao' => 'vigente',
        ]);

        // Filtro com_concessao
        $resCom = $this->como($admin, $t)->getJson('/api/cemiterios/jazigos?concessao_status=com_concessao')->assertOk();
        $codsCom = collect((array) $resCom->json('data'))->pluck('codigo');
        $this->assertTrue($codsCom->contains('J-CONC-01'));
        $this->assertFalse($codsCom->contains('J-SEM-CONC'));

        // Filtro sem_concessao
        $resSem = $this->como($admin, $t)->getJson('/api/cemiterios/jazigos?concessao_status=sem_concessao')->assertOk();
        $codsSem = collect((array) $resSem->json('data'))->pluck('codigo');
        $this->assertTrue($codsSem->contains('J-SEM-CONC'));
        $this->assertFalse($codsSem->contains('J-CONC-01'));

        // Criar guia vinculada à concessão
        $guia = new Guia([
            'numero' => '1001/2026',
            'origem_type' => 'concessao',
            'origem_id' => $concessao->id,
            'holder_id' => $titular->id,
            'contribuinte_nome' => $titular->nome,
            'servico' => 'taxa_manutencao_anual',
            'exercicio' => 2026,
            'valor_centavos' => 15000,
            'vencimento' => today()->addDays(30),
            'situacao' => 'emitida',
        ]);
        $guia->forceFill(['tenant_id' => $t->id])->save();

        // Buscar guias pelo plot_id
        $resGuias = $this->como($admin, $t)->getJson("/api/cemiterios/guias?plot_id={$jComConc->id}")->assertOk();
        $this->assertEquals(1, $resGuias->json('total'));
        $this->assertEquals('1001/2026', $resGuias->json('data.0.numero'));

        // Jazigo sem guias deve retornar vazio
        $resGuiasVazio = $this->como($admin, $t)->getJson("/api/cemiterios/guias?plot_id={$jSemConc->id}")->assertOk();
        $this->assertEquals(0, $resGuiasVazio->json('total'));
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

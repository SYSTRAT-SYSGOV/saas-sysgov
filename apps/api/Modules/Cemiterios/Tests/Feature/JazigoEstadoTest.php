<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Jazigo;
use Modules\Cemiterios\Models\JazigoHistorico;
use Modules\Cemiterios\Services\JazigoEstadoService;
use Modules\Cemiterios\Support\ConflitoVersaoException;
use Modules\Cemiterios\Support\EstadoJazigo;
use Modules\Cemiterios\Support\RegraNegocioException;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: cemiterio/inventario — máquina de estados, bloqueio e concorrência (RF-04, RF-05, RNF-06). */
final class JazigoEstadoTest extends CemiteriosTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_transicao_manual_disponivel_para_ocupado_e_rejeitada(): void
    {
        $jazigo = $this->jazigo();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/cemiterios/jazigos/{$jazigo->id}/estado", ['para' => 'ocupado', 'motivo' => 'x', 'lock_version' => 0])
            ->assertUnprocessable();

        $this->noTenant($this->tenant);
        self::assertSame(EstadoJazigo::Disponivel, $jazigo->refresh()->estado);
    }

    public function test_entrar_e_sair_de_manutencao_registra_historico(): void
    {
        $jazigo = $this->jazigo();
        $admin = $this->admin($this->tenant);

        $this->como($admin, $this->tenant)
            ->postJson("/api/cemiterios/jazigos/{$jazigo->id}/estado", ['para' => 'manutencao', 'motivo' => 'Ruína', 'lock_version' => 0])
            ->assertOk()->assertJsonPath('estado', 'manutencao');
        $this->como($admin, $this->tenant)
            ->postJson("/api/cemiterios/jazigos/{$jazigo->id}/estado", ['para' => 'restaurar', 'motivo' => 'Reformado', 'lock_version' => 1])
            ->assertOk()->assertJsonPath('estado', 'disponivel');

        $this->noTenant($this->tenant);
        self::assertSame(2, JazigoHistorico::where('plot_id', $jazigo->id)->count());
    }

    public function test_ocupacao_que_atinge_a_capacidade_vira_capacidade_maxima(): void
    {
        $servico = app(JazigoEstadoService::class);
        $jazigo = $this->jazigo(3);
        $servico->alterarOcupacao($jazigo, 2, 'inumações');
        self::assertSame(EstadoJazigo::Ocupado, $jazigo->estado);

        $servico->alterarOcupacao($jazigo, 1, 'inumação');

        self::assertSame(EstadoJazigo::CapacidadeMaxima, $jazigo->estado);
        self::assertTrue(JazigoHistorico::where('plot_id', $jazigo->id)->where('para', 'capacidade_maxima')->exists());
    }

    public function test_ocupacao_acima_da_capacidade_e_bloqueada(): void
    {
        $jazigo = $this->jazigo(1);
        app(JazigoEstadoService::class)->alterarOcupacao($jazigo, 1, 'inumação');

        $this->expectException(RegraNegocioException::class);
        app(JazigoEstadoService::class)->alterarOcupacao($jazigo, 1, 'inumação');
    }

    public function test_duas_atualizacoes_com_a_mesma_versao_so_uma_efetiva(): void
    {
        $servico = app(JazigoEstadoService::class);
        $leituraA = $this->jazigo(3);
        $leituraB = Jazigo::findOrFail($leituraA->id);

        $servico->alterarOcupacao($leituraA, 1, 'A');

        try {
            $servico->alterarOcupacao($leituraB, 1, 'B');
            self::fail('Era esperado conflito de versão.');
        } catch (ConflitoVersaoException) {
        }

        self::assertSame(1, $leituraA->refresh()->ocupacao);
    }

    private function jazigo(int $capacidade = 2): Jazigo
    {
        $parque = Cemiterio::create(['codigo' => 'C' . random_int(1, 99999), 'nome' => 'Central']);
        $setor = $parque->setores()->create(['codigo' => 'Q1', 'tipo_zona' => 'jazigos']);

        return Jazigo::create(['park_id' => $parque->id, 'sector_id' => $setor->id, 'codigo' => 'J1', 'tipo' => 'jazigo', 'capacidade' => $capacidade])->refresh();
    }
}

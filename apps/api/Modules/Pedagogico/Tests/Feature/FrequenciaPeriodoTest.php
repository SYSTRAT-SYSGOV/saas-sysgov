<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Pedagogico\Tests\Concerns\CenarioPedagogico;
use Modules\Pedagogico\Tests\TestCase;

/** Fase 2, tarefa 4.2 — aulas do dia, consulta por período e total de faltas da frequência. */
final class FrequenciaPeriodoTest extends TestCase
{
    use CenarioPedagogico;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-09-27 09:00:00');
    }

    public function test_chamada_guarda_aulas_e_consulta_por_periodo(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $ana = $this->aluno($tenant, $turma, 'Ana');
        $direcao = $this->usuario($tenant);
        $chamada = fn (string $data, string $presenca, ?int $aulas = null) => $this->como($direcao, $tenant)->putJson('/api/pedagogico/frequencias', array_filter([
            'turma_id' => $turma->id, 'data' => $data, 'aulas' => $aulas, 'registros' => [['aluno_id' => $ana->id, 'presenca' => $presenca]],
        ], fn ($v) => $v !== null));

        $chamada('2026-08-31', 'falta', 5)->assertOk();
        $chamada('2026-09-01', 'falta', 5)->assertOk();
        $chamada('2026-09-02', 'presente')->assertOk();
        $chamada('2026-09-03', 'falta', 11)->assertStatus(422)->assertJsonValidationErrors('aulas');

        $this->como($direcao, $tenant)->getJson("/api/pedagogico/frequencias?turma_id={$turma->id}&data_inicio=2026-09-01&data_fim=2026-09-30")
            ->assertOk()->assertJsonCount(2)
            ->assertJsonPath('0.data', '2026-09-01')->assertJsonPath('0.aulas', 5)
            ->assertJsonPath('1.data', '2026-09-02')->assertJsonPath('1.aulas', 1);
        $this->como($direcao, $tenant)->getJson("/api/pedagogico/frequencias?turma_id={$turma->id}")->assertStatus(422);
    }

    public function test_totais_somam_aulas_das_faltas_sem_contar_justificadas(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $ana = $this->aluno($tenant, $turma, 'Ana');
        $bia = $this->aluno($tenant, $turma, 'Bia');
        $direcao = $this->usuario($tenant);
        foreach ([['2026-09-01', 5, 'falta', 'falta'], ['2026-09-02', 4, 'falta', 'falta_justificada'], ['2026-09-03', 5, 'presente', 'presente']] as [$data, $aulas, $pAna, $pBia]) {
            $this->como($direcao, $tenant)->putJson('/api/pedagogico/frequencias', [
                'turma_id' => $turma->id, 'data' => $data, 'aulas' => $aulas,
                'registros' => [['aluno_id' => $ana->id, 'presenca' => $pAna], ['aluno_id' => $bia->id, 'presenca' => $pBia]],
            ])->assertOk();
        }

        /** @var list<array{aluno_id: int, faltas: int, justificadas: int}> $linhas */
        $linhas = $this->como($direcao, $tenant)->getJson('/api/pedagogico/frequencias/totais?data_inicio=2026-01-01&data_fim=2026-12-31')->assertOk()->json();
        $totais = collect($linhas)->keyBy('aluno_id');
        $this->assertSame(9, $totais[$ana->id]['faltas']);
        $this->assertSame(5, $totais[$bia->id]['faltas']);
        $this->assertSame(1, $totais[$bia->id]['justificadas']);

        $this->como($direcao, $tenant)->getJson("/api/pedagogico/frequencias/totais?turma_id={$turma->id}&data_inicio=2026-09-02&data_fim=2026-09-30")
            ->assertOk()->assertJsonCount(2)
            ->assertJsonPath('0.aluno_id', $ana->id)->assertJsonPath('0.faltas', 4)
            ->assertJsonPath('1.aluno_id', $bia->id)->assertJsonPath('1.faltas', 0)->assertJsonPath('1.justificadas', 1);
    }

    public function test_professor_so_ve_totais_das_proprias_turmas(): void
    {
        $tenant = $this->criarTenant();
        $seisA = $this->turma($tenant, '6º A');
        $seteB = $this->turma($tenant, '7º B');
        $professor = $this->usuario($tenant, ['pedagogico_professor']);
        $this->vincular($tenant, $seisA, $this->materia($tenant), $professor);
        $direcao = $this->usuario($tenant);
        foreach ([$seisA, $seteB] as $turma) {
            $aluno = $this->aluno($tenant, $turma, "Aluno {$turma->nome}");
            $this->como($direcao, $tenant)->putJson('/api/pedagogico/frequencias', [
                'turma_id' => $turma->id, 'data' => '2026-09-01', 'registros' => [['aluno_id' => $aluno->id, 'presenca' => 'falta']],
            ])->assertOk();
        }

        $this->como($professor, $tenant)->getJson('/api/pedagogico/frequencias/totais?data_inicio=2026-01-01&data_fim=2026-12-31')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.faltas', 1);
        $this->como($professor, $tenant)->getJson("/api/pedagogico/frequencias?turma_id={$seteB->id}&data_inicio=2026-09-01&data_fim=2026-09-30")->assertStatus(403);
    }
}

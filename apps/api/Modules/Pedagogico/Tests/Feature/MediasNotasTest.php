<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Pedagogico\Tests\Concerns\CenarioPedagogico;
use Modules\Pedagogico\Tests\TestCase;

/** Fase 2, tarefa 4.2 — média anual por aluno para o painel pedagógico. */
final class MediasNotasTest extends TestCase
{
    use CenarioPedagogico;
    use RefreshDatabase;

    public function test_media_por_aluno_usa_a_recuperacao_quando_maior_e_trunca_em_uma_casa(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $mat = $this->materia($tenant, 'Matemática');
        $port = $this->materia($tenant, 'Português');
        $ana = $this->aluno($tenant, $turma, 'Ana');
        $bia = $this->aluno($tenant, $turma, 'Bia');
        $direcao = $this->usuario($tenant);
        $lancar = fn (int $materia, int $tri, array $notas) => $this->como($direcao, $tenant)->putJson('/api/pedagogico/notas', [
            'turma_id' => $turma->id, 'materia_id' => $materia, 'ano_letivo' => 2026, 'trimestre' => $tri, 'notas' => $notas,
        ])->assertOk();

        // Ana: 5,0 (recuperação 7,0) + 6,0 + 6,0 → (7 + 6 + 6) / 3 = 6,33… → 6,3
        $lancar($mat->id, 1, [['aluno_id' => $ana->id, 'nota' => 5.0, 'nota_recuperacao' => 7.0], ['aluno_id' => $bia->id, 'nota' => 9.0]]);
        $lancar($mat->id, 2, [['aluno_id' => $ana->id, 'nota' => 6.0]]);
        $lancar($port->id, 1, [['aluno_id' => $ana->id, 'nota' => 6.0, 'nota_recuperacao' => 4.0]]);

        /** @var list<array{aluno_id: int, media: float}> $linhas */
        $linhas = $this->como($direcao, $tenant)->getJson('/api/pedagogico/notas/medias?ano_letivo=2026')->assertOk()->assertJsonCount(2)->json();
        $medias = collect($linhas)->pluck('media', 'aluno_id');
        $this->assertSame(6.3, $medias[$ana->id]);
        $this->assertEquals(9.0, $medias[$bia->id]);

        $this->como($direcao, $tenant)->getJson('/api/pedagogico/notas/medias?ano_letivo=2025')->assertOk()->assertJsonCount(0);
    }

    public function test_professor_ve_so_as_medias_das_proprias_turmas(): void
    {
        $tenant = $this->criarTenant();
        $seisA = $this->turma($tenant, '6º A');
        $seteB = $this->turma($tenant, '7º B');
        $mat = $this->materia($tenant);
        $professor = $this->usuario($tenant, ['pedagogico_professor']);
        $this->vincular($tenant, $seisA, $mat, $professor);
        $daSeisA = $this->aluno($tenant, $seisA, 'Da 6A');
        $daSeteB = $this->aluno($tenant, $seteB, 'Da 7B');
        $direcao = $this->usuario($tenant);
        foreach ([[$seisA, $daSeisA], [$seteB, $daSeteB]] as [$turma, $aluno]) {
            $this->como($direcao, $tenant)->putJson('/api/pedagogico/notas', [
                'turma_id' => $turma->id, 'materia_id' => $mat->id, 'ano_letivo' => 2026, 'trimestre' => 1,
                'notas' => [['aluno_id' => $aluno->id, 'nota' => 8.0]],
            ])->assertOk();
        }

        $this->como($professor, $tenant)->getJson('/api/pedagogico/notas/medias?ano_letivo=2026')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.aluno_id', $daSeisA->id);
    }

    public function test_ano_letivo_obrigatorio(): void
    {
        $tenant = $this->criarTenant();

        $this->como($this->usuario($tenant), $tenant)->getJson('/api/pedagogico/notas/medias')
            ->assertStatus(422)->assertJsonValidationErrors('ano_letivo');
    }
}

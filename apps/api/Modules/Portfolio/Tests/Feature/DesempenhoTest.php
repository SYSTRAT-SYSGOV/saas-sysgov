<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class DesempenhoTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;

    public function test_medias_por_materia_e_trimestre(): void
    {
        $tenant = $this->criarTenant();
        $this->trimestres($tenant);
        $gestor = $this->usuario($tenant);
        $turma = $this->turma($tenant);
        $hist = $this->materia($tenant, 'História');
        $mat = $this->materia($tenant, 'Matemática');
        $this->vincular($tenant, $turma, $hist);
        $this->vincular($tenant, $turma, $mat);
        $aluno = $this->aluno($tenant, $turma, 'Ana');
        foreach ([[$hist, '2026-03-01', 8], [$hist, '2026-05-10', 9], [$hist, '2026-09-10', 7], [$mat, '2026-03-05', 7], [$mat, '2026-03-06', 8]] as [$m, $d, $n]) {
            $this->como($gestor, $tenant)->postJson("/api/portfolio/alunos/{$aluno->id}/trabalhos", ['titulo' => 'T', 'materia_id' => $m->id, 'data' => $d, 'avaliacao' => $n])->assertCreated();
        }

        $r = $this->como($gestor, $tenant)->getJson("/api/portfolio/alunos/{$aluno->id}/desempenho?ano=2026")->assertOk();
        $r->assertJsonPath('total', 5)
            ->assertJsonPath('media', 7.8) // 39/5
            ->assertJsonPath('por_materia.0.materia', 'História')
            ->assertJsonPath('por_materia.0.quantidade', 3)
            ->assertJsonPath('por_materia.0.media', 8)
            ->assertJsonPath('por_materia.1.media', 7.5)
            ->assertJsonPath('por_trimestre.0.media', 7.7) // 8,7,8 → 7,666… → 7,7
            ->assertJsonPath('por_trimestre.1.quantidade', 1)
            ->assertJsonPath('por_trimestre.2.media', 7);

        $this->como($gestor, $tenant)->getJson("/api/portfolio/alunos/{$aluno->id}/desempenho?ano=2026&trimestre=1")
            ->assertOk()->assertJsonPath('total', 3)->assertJsonPath('por_trimestre', null);
    }

    public function test_aluno_sem_trabalhos(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->aluno($tenant, $this->turma($tenant), 'Ana');

        $this->como($this->usuario($tenant), $tenant)->getJson("/api/portfolio/alunos/{$aluno->id}/desempenho?ano=2026")
            ->assertOk()->assertJsonPath('total', 0)->assertJsonPath('media', null)->assertJsonCount(0, 'por_materia');
    }
}

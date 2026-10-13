<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Services\EscopoPortfolio;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class EscopoPortfolioTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;

    public function test_professor_ve_so_suas_turmas_e_lanca_so_nas_suas_materias(): void
    {
        $tenant = $this->criarTenant();
        $professor = $this->usuario($tenant, ['portfolio_professor']);
        $gestor = $this->usuario($tenant, ['portfolio_gestor']);
        $seisA = $this->turma($tenant, '6º A');
        $seisB = $this->turma($tenant, '6º B');
        $mat = $this->materia($tenant, 'Matemática');
        $port = $this->materia($tenant, 'Português');
        $this->vincular($tenant, $seisA, $mat, $professor);
        $this->vincular($tenant, $seisA, $port);
        $this->vincular($tenant, $seisB, $mat);
        $alunoA = $this->aluno($tenant, $seisA, 'Ana');
        $alunoB = $this->aluno($tenant, $seisB, 'Bia');

        $this->noTenant($tenant, function () use ($professor, $gestor, $seisA, $seisB, $mat, $port, $alunoA, $alunoB): void {
            $escopo = app(EscopoPortfolio::class);
            $this->assertTrue($escopo->restrito($professor));
            $this->assertFalse($escopo->restrito($gestor));
            $this->assertEquals([$seisA->id], $escopo->turmasDoProfessor($professor)->all());
            $this->assertTrue($escopo->podeVerAluno($professor, $alunoA));
            $this->assertFalse($escopo->podeVerAluno($professor, $alunoB));
            $this->assertTrue($escopo->podeVerAluno($gestor, $alunoB));
            $this->assertTrue($escopo->podeLancar($professor, $seisA->id, $mat->id));
            $this->assertFalse($escopo->podeLancar($professor, $seisA->id, $port->id));
            $this->assertTrue($escopo->podeLancar($gestor, $seisB->id, $port->id));
        });
    }

    public function test_restringir_limita_aos_pares_turma_materia_do_professor(): void
    {
        $tenant = $this->criarTenant();
        $professor = $this->usuario($tenant, ['portfolio_professor']);
        $gestor = $this->usuario($tenant);
        $turma = $this->turma($tenant);
        $mat = $this->materia($tenant, 'Matemática');
        $port = $this->materia($tenant, 'Português');
        $this->vincular($tenant, $turma, $mat, $professor);
        $this->vincular($tenant, $turma, $port);
        $aluno = $this->aluno($tenant, $turma, 'Ana');

        $this->noTenant($tenant, function () use ($professor, $gestor, $turma, $mat, $port, $aluno): void {
            foreach ([$mat, $port] as $materia) {
                Trabalho::create([
                    'aluno_id' => $aluno->id, 'turma_id' => $turma->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026,
                    'titulo' => "Trabalho de {$materia->nome}", 'data' => '2026-06-10', 'avaliacao_decimos' => 80, 'registrado_por' => $gestor->id,
                ]);
            }
            $escopo = app(EscopoPortfolio::class);
            $this->assertSame(['Trabalho de Matemática'], $escopo->restringir(Trabalho::query(), $professor)->pluck('titulo')->all());
            $this->assertSame(2, $escopo->restringir(Trabalho::query(), $gestor)->count());
        });
    }

    public function test_professor_sem_vinculo_nao_ve_nada(): void
    {
        $tenant = $this->criarTenant();
        $professor = $this->usuario($tenant, ['portfolio_professor']);
        $turma = $this->turma($tenant);
        $aluno = $this->aluno($tenant, $turma, 'Ana');

        $this->noTenant($tenant, function () use ($professor, $aluno): void {
            $escopo = app(EscopoPortfolio::class);
            $this->assertFalse($escopo->podeVerAluno($professor, $aluno));
            $this->assertSame(0, $escopo->restringir(Trabalho::query(), $professor)->count());
        });
    }
}

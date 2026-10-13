<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class ConsultaTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;

    private Tenant $tenant;
    private User $gestor;
    private User $professor;
    private Turma $seisA;
    private Turma $seisB;
    private Materia $mat;
    private Materia $port;
    private Aluno $ana;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->trimestres($this->tenant);
        $this->gestor = $this->usuario($this->tenant);
        $this->professor = $this->usuario($this->tenant, ['portfolio_professor']);
        $this->seisA = $this->turma($this->tenant, '6º A');
        $this->seisB = $this->turma($this->tenant, '6º B');
        $this->mat = $this->materia($this->tenant, 'Matemática');
        $this->port = $this->materia($this->tenant, 'Português');
        $this->vincular($this->tenant, $this->seisA, $this->mat, $this->professor);
        $this->vincular($this->tenant, $this->seisA, $this->port);
        $this->ana = $this->aluno($this->tenant, $this->seisA, 'Ana');
        $this->aluno($this->tenant, $this->seisA, 'Beto');
        $this->aluno($this->tenant, $this->seisB, 'Caio');

        foreach ([[$this->mat, '2026-03-10', 8], [$this->mat, '2026-06-10', 9], [$this->port, '2026-06-20', 6]] as [$materia, $data, $nota]) {
            $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", [
                'titulo' => "Trabalho {$data}", 'materia_id' => $materia->id, 'data' => $data, 'avaliacao' => $nota,
            ])->assertCreated();
        }
    }

    public function test_turmas_do_gestor_e_do_professor(): void
    {
        $this->como($this->gestor, $this->tenant)->getJson('/api/portfolio/turmas?ano=2026')
            ->assertOk()->assertJsonCount(2, 'turmas')->assertJsonPath('turmas.0.nome', '6º A')->assertJsonPath('turmas.0.alunos', 2);
        $this->como($this->professor, $this->tenant)->getJson('/api/portfolio/turmas?ano=2026')
            ->assertOk()->assertJsonCount(1, 'turmas');
    }

    public function test_alunos_da_turma_com_total_e_media_no_periodo(): void
    {
        /** @var list<array<string, mixed>> $lista */
        $lista = $this->como($this->gestor, $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisA->id}/alunos?ano=2026")->assertOk()->json('alunos');
        $alunos = collect($lista);
        $ana = $alunos->firstWhere('nome', 'ANA');
        $this->assertSame(3, $ana['total_trabalhos']);
        $this->assertEquals(7.7, $ana['media']); // (8+9+6)/3 = 7,666… → 7,7
        $this->assertNull($alunos->firstWhere('nome', 'BETO')['media']);

        // Professor de Matemática: só os 2 trabalhos de Matemática contam
        /** @var list<array<string, mixed>> $lista */
        $lista = $this->como($this->professor, $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisA->id}/alunos?ano=2026&trimestre=2")->json('alunos');
        $ana = collect($lista)->firstWhere('nome', 'ANA');
        $this->assertSame(1, $ana['total_trabalhos']);
        $this->assertEquals(9, $ana['media']);
    }

    public function test_professor_nao_lista_alunos_de_turma_alheia(): void
    {
        $this->como($this->professor, $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisB->id}/alunos")->assertNotFound();
    }

    public function test_materias_lancaveis(): void
    {
        $this->como($this->professor, $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisA->id}/materias")
            ->assertOk()->assertJsonCount(1, 'materias')->assertJsonPath('materias.0.nome', 'Matemática');
        $this->como($this->gestor, $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisA->id}/materias")
            ->assertOk()->assertJsonCount(2, 'materias');
        $this->como($this->usuarioSoVisualizacao($this->tenant), $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisA->id}/materias")
            ->assertOk()->assertJsonCount(0, 'materias');
    }

    public function test_linha_do_tempo_ordenada_filtrada_e_restrita(): void
    {
        $this->como($this->gestor, $this->tenant)->getJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos?ano=2026")
            ->assertOk()->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.data', '2026-06-20')
            ->assertJsonPath('data.2.data', '2026-03-10');

        $this->como($this->gestor, $this->tenant)->getJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos?ano=2026&trimestre=2")
            ->assertOk()->assertJsonCount(2, 'data');

        $this->como($this->professor, $this->tenant)->getJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos?ano=2026")
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.materia.nome', 'Matemática');
    }

    public function test_linha_do_tempo_do_professor_nao_faz_consulta_por_trabalho(): void
    {
        foreach (range(1, 15) as $i) {
            $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", [
                'titulo' => "Extra {$i}", 'materia_id' => $this->mat->id, 'data' => '2026-07-01', 'avaliacao' => 7,
            ])->assertCreated();
        }
        \Illuminate\Support\Facades\DB::flushQueryLog();
        \Illuminate\Support\Facades\DB::enableQueryLog();
        $this->como($this->professor, $this->tenant)->getJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos?ano=2026")->assertOk()->assertJsonCount(17, 'data');
        $consultas = count(\Illuminate\Support\Facades\DB::getQueryLog());
        \Illuminate\Support\Facades\DB::disableQueryLog();

        // 17 trabalhos: o custo não pode crescer com a quantidade (antes eram ~3 consultas por trabalho).
        $this->assertLessThan(30, $consultas);
    }

    public function test_materias_informam_quando_a_turma_nao_tem_vinculos(): void
    {
        // Lista vazia por falta de vínculo na turma é diferente de "você não leciona aqui": a tela orienta a vincular.
        $this->como($this->gestor, $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisB->id}/materias")
            ->assertOk()->assertJsonCount(0, 'materias')->assertJsonPath('sem_vinculos', true);
        $this->como($this->gestor, $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisA->id}/materias")
            ->assertOk()->assertJsonPath('sem_vinculos', false);
        $this->como($this->usuarioSoVisualizacao($this->tenant), $this->tenant)->getJson("/api/portfolio/turmas/{$this->seisA->id}/materias")
            ->assertOk()->assertJsonCount(0, 'materias')->assertJsonPath('sem_vinculos', false);
    }
}

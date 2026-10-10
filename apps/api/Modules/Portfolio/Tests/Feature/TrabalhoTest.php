<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;
use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class TrabalhoTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;

    private Tenant $tenant;
    private User $professor;
    private User $gestor;
    private Turma $seisA;
    private Materia $mat;
    private Materia $port;
    private Aluno $ana;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->trimestres($this->tenant);
        $this->professor = $this->usuario($this->tenant, ['portfolio_professor']);
        $this->gestor = $this->usuario($this->tenant, ['portfolio_gestor']);
        $this->seisA = $this->turma($this->tenant, '6º A');
        $this->mat = $this->materia($this->tenant, 'Matemática');
        $this->port = $this->materia($this->tenant, 'Português');
        $this->vincular($this->tenant, $this->seisA, $this->mat, $this->professor);
        $this->vincular($this->tenant, $this->seisA, $this->port);
        $this->ana = $this->aluno($this->tenant, $this->seisA, 'Ana');
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function dados(array $extra = []): array
    {
        return ['titulo' => 'Maquete do sistema solar', 'materia_id' => $this->mat->id, 'data' => '2026-06-15', 'avaliacao' => 8.5, 'descricao' => 'Em grupo', ...$extra];
    }

    public function test_professor_registra_na_propria_materia_com_trimestre_deduzido(): void
    {
        $this->como($this->professor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados())
            ->assertCreated()
            ->assertJsonPath('data.avaliacao', 8.5)
            ->assertJsonPath('data.trimestre', 2)
            ->assertJsonPath('data.ano_letivo', 2026)
            ->assertJsonPath('data.turma.nome', '6º A')
            ->assertJsonPath('data.pode_editar', true);

        $this->assertTrue(AuditLog::query()->where('action', 'trabalho.criado')->exists());
    }

    public function test_professor_em_materia_de_outro_professor_recebe_403(): void
    {
        $this->como($this->professor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados(['materia_id' => $this->port->id]))
            ->assertForbidden();
    }

    public function test_usuario_so_com_visualizacao_recebe_403(): void
    {
        $this->como($this->usuarioSoVisualizacao($this->tenant), $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados())
            ->assertForbidden();
    }

    public function test_professor_nao_enxerga_aluno_de_turma_alheia(): void
    {
        $bia = $this->aluno($this->tenant, $this->turma($this->tenant, '6º B'), 'Bia');
        $this->como($this->professor, $this->tenant)->postJson("/api/portfolio/alunos/{$bia->id}/trabalhos", $this->dados())
            ->assertNotFound();
    }

    public function test_aluno_de_outro_tenant_e_404(): void
    {
        $outro = $this->criarTenant('escola-b');
        $alheio = $this->aluno($outro, $this->turma($outro), 'Zé');
        $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$alheio->id}/trabalhos", $this->dados())
            ->assertNotFound();
    }

    public function test_validacoes_de_avaliacao_materia_e_data(): void
    {
        $como = $this->como($this->gestor, $this->tenant);
        $url = "/api/portfolio/alunos/{$this->ana->id}/trabalhos";
        $como->postJson($url, $this->dados(['avaliacao' => 10.5]))->assertStatus(422)->assertJsonValidationErrors('avaliacao');
        $como->postJson($url, $this->dados(['avaliacao' => 7.25]))->assertStatus(422)->assertJsonValidationErrors('avaliacao');
        $como->postJson($url, $this->dados(['titulo' => '']))->assertStatus(422)->assertJsonValidationErrors('titulo');
        $outra = $this->materia($this->tenant, 'Química');
        $como->postJson($url, $this->dados(['materia_id' => $outra->id]))->assertStatus(422)->assertJsonValidationErrors('materia_id');
        $como->postJson($url, $this->dados(['data' => '2025-11-10']))->assertStatus(422)->assertJsonValidationErrors('data');
    }

    public function test_data_fora_de_trimestre_fica_sem_trimestre(): void
    {
        $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados(['data' => '2026-01-20']))
            ->assertCreated()->assertJsonPath('data.trimestre', null);
    }

    public function test_aluno_transferido_e_sem_turma_sao_recusados(): void
    {
        $transferido = $this->aluno($this->tenant, $this->seisA, 'Caio', ['situacao' => 'transferido']);
        $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$transferido->id}/trabalhos", $this->dados())
            ->assertStatus(422)->assertJsonPath('error', 'O aluno foi transferido e não recebe novos trabalhos.');

        $semTurma = $this->aluno($this->tenant, null, 'Duda');
        $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$semTurma->id}/trabalhos", $this->dados())
            ->assertStatus(422)->assertJsonPath('error', 'O aluno não está em nenhuma turma.');
    }

    public function test_edicao_recalcula_trimestre_e_exclusao_audita(): void
    {
        $id = $this->como($this->professor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados())
            ->assertCreated()->json('data.id');

        $this->como($this->professor, $this->tenant)->putJson("/api/portfolio/trabalhos/{$id}", ['data' => '2026-10-01', 'avaliacao' => 9])
            ->assertOk()->assertJsonPath('data.trimestre', 3)->assertJsonPath('data.avaliacao', 9);

        $this->como($this->professor, $this->tenant)->deleteJson("/api/portfolio/trabalhos/{$id}")->assertOk();
        $this->assertSoftDeleted('portfolio_trabalhos', ['id' => $id]);
        $this->assertTrue(AuditLog::query()->where('action', 'trabalho.excluido')->exists());
    }

    public function test_professor_nao_altera_trabalho_de_outra_materia(): void
    {
        $id = $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados(['materia_id' => $this->port->id]))
            ->assertCreated()->json('data.id');

        // Fora do escopo de leitura do professor: 404
        $this->como($this->professor, $this->tenant)->putJson("/api/portfolio/trabalhos/{$id}", ['titulo' => 'Outro'])->assertNotFound();
        $this->como($this->professor, $this->tenant)->deleteJson("/api/portfolio/trabalhos/{$id}")->assertNotFound();
    }

    public function test_remanejado_mantem_turma_do_registro(): void
    {
        $id = $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados())
            ->assertCreated()->json('data.id');
        $seisB = $this->turma($this->tenant, '6º B');
        $this->noTenant($this->tenant, fn () => $this->ana->update(['turma_id' => $seisB->id, 'turma_origem_id' => $this->seisA->id, 'situacao' => 'remanejado']));

        $this->assertSame($this->seisA->id, $this->noTenant($this->tenant, fn () => Trabalho::findOrFail($id)->turma_id));
    }

    public function test_edicao_sem_trocar_materia_funciona_mesmo_sem_o_vinculo(): void
    {
        $id = $this->como($this->gestor, $this->tenant)->postJson("/api/portfolio/alunos/{$this->ana->id}/trabalhos", $this->dados(['materia_id' => $this->port->id]))
            ->assertCreated()->json('data.id');
        $this->noTenant($this->tenant, fn () => \Modules\Escola\Models\TurmaMateria::where('turma_id', $this->seisA->id)->where('materia_id', $this->port->id)->delete());

        $this->como($this->gestor, $this->tenant)->putJson("/api/portfolio/trabalhos/{$id}", ['titulo' => 'Título corrigido'])
            ->assertOk()->assertJsonPath('data.titulo', 'Título corrigido');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Concerns\VariasEscolas;
use Modules\Pedagogico\Models\Ata;
use Modules\Pedagogico\Models\Cronograma;
use Modules\Pedagogico\Models\Frequencia;
use Modules\Pedagogico\Models\Nota;
use Modules\Pedagogico\Models\Ocorrencia;
use Modules\Pedagogico\Models\PreConselho;
use Modules\Pedagogico\Models\PreConselhoAluno;
use Modules\Pedagogico\Tests\Concerns\CenarioPedagogico;
use Modules\Pedagogico\Tests\TestCase;

/** Isolamento do Pedagógico entre escolas do mesmo tenant (change educacao-multiescola, fase A). */
final class MultiEscolaPedagogicoTest extends TestCase
{
    use CenarioPedagogico;
    use RefreshDatabase;
    use VariasEscolas;

    private Tenant $tenant;

    private Escola $escolaA;

    private Escola $escolaB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->escolaA = $this->novaEscola($this->tenant, 'Escola A');
        $this->escolaB = $this->novaEscola($this->tenant, 'Escola B');
    }

    public function test_todos_os_models_sao_isolados_entre_escolas(): void
    {
        $idsA = $this->naEscola($this->tenant, $this->escolaA, fn (): array => $this->montar('A'));
        $this->naEscola($this->tenant, $this->escolaB, fn (): array => $this->montar('B'));

        foreach ($idsA as $model => $id) {
            $this->naEscola($this->tenant, $this->escolaB, function () use ($model, $id): void {
                $this->assertSame(1, $model::count(), "{$model}: a escola B deveria ver só o próprio registro.");
                $this->assertNull($model::find($id), "{$model}: a escola B não pode ver o registro da escola A.");
            });
        }
    }

    public function test_nota_para_aluno_de_outra_escola_e_rejeitada(): void
    {
        [$turmaA, $materiaA] = $this->naEscola($this->tenant, $this->escolaA, function (): array {
            $turno = Turno::create(['nome' => 'Manhã', 'ordem' => 1]);

            return [Turma::create(['nome' => '6º A', 'turno_id' => $turno->id, 'ano_letivo' => 2026]), Materia::create(['nome' => 'Matemática'])];
        });
        $alunoB = $this->naEscola($this->tenant, $this->escolaB, function (): Aluno {
            $turno = Turno::create(['nome' => 'Manhã', 'ordem' => 1]);
            $turma = Turma::create(['nome' => '6º B', 'turno_id' => $turno->id, 'ano_letivo' => 2026]);

            return Aluno::create(['nome' => 'ALUNO B', 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        });

        $this->como($this->usuario($this->tenant), $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaA->id)
            ->putJson('/api/pedagogico/notas', [
                'turma_id' => $turmaA->id, 'materia_id' => $materiaA->id, 'ano_letivo' => 2026, 'trimestre' => 1,
                'notas' => [['aluno_id' => $alunoB->id, 'nota' => 7]],
            ])->assertStatus(422)->assertJsonValidationErrors('notas.0.aluno_id');
        $this->assertSame(0, Nota::withoutGlobalScopes()->count());
    }

    public function test_ocorrencia_para_aluno_de_outra_escola_e_rejeitada(): void
    {
        $categoriaA = $this->naEscola($this->tenant, $this->escolaA, fn (): CategoriaOcorrencia => CategoriaOcorrencia::create(['nome' => 'Atraso', 'cor' => '#ff0000']));
        $alunoB = $this->naEscola($this->tenant, $this->escolaB, function (): Aluno {
            $turma = Turma::create(['nome' => '6º B', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]);

            return Aluno::create(['nome' => 'ALUNO B', 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        });

        // O "exists" é a única barreira aqui: tem de filtrar pela escola de trabalho.
        $this->como($this->usuario($this->tenant), $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaA->id)
            ->postJson('/api/pedagogico/ocorrencias', ['aluno_id' => $alunoB->id, 'categoria_id' => $categoriaA->id, 'data' => '2026-03-02', 'descricao' => 'Teste', 'severidade' => 'baixa'])
            ->assertStatus(422)->assertJsonValidationErrors('aluno_id');
        $this->assertSame(0, Ocorrencia::withoutGlobalScopes()->count());
    }

    public function test_ata_de_outra_escola_responde_404(): void
    {
        $ataB = $this->naEscola($this->tenant, $this->escolaB, function (): Ata {
            $turno = Turno::create(['nome' => 'Manhã', 'ordem' => 1]);
            $turma = Turma::create(['nome' => '6º B', 'turno_id' => $turno->id, 'ano_letivo' => 2026]);

            return Ata::create(['turma_id' => $turma->id, 'ano_letivo' => 2026, 'periodo' => 1, 'data_reuniao' => '2026-04-30', 'status' => 'rascunho']);
        });

        $this->como($this->usuario($this->tenant), $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaA->id)
            ->getJson("/api/pedagogico/atas/{$ataB->id}")->assertNotFound();
        $this->como($this->usuario($this->tenant), $this->tenant)->withHeader('X-Escola-ID', (string) $this->escolaB->id)
            ->getJson("/api/pedagogico/atas/{$ataB->id}")->assertOk();
    }

    /** @return array<class-string<Model>, int> */
    private function montar(string $s): array
    {
        $turno = Turno::create(['nome' => "Manhã {$s}", 'ordem' => 1]);
        $turma = Turma::create(['nome' => "6º {$s}", 'turno_id' => $turno->id, 'ano_letivo' => 2026]);
        $aluno = Aluno::create(['nome' => "Aluno {$s}", 'turma_id' => $turma->id, 'situacao' => 'ativo']);
        $materia = Materia::create(['nome' => "Matemática {$s}"]);
        $categoria = CategoriaOcorrencia::create(['nome' => "Falta {$s}", 'cor' => '#ffffff']);
        $ficha = PreConselho::create(['turma_id' => $turma->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026, 'periodo' => 1, 'data_registro' => '2026-04-10', 'desempenho_geral' => 'bom']);

        return [
            Nota::class => Nota::create(['aluno_id' => $aluno->id, 'materia_id' => $materia->id, 'ano_letivo' => 2026, 'trimestre' => 1, 'nota' => 7])->id,
            Ocorrencia::class => Ocorrencia::create(['aluno_id' => $aluno->id, 'categoria_id' => $categoria->id, 'data' => '2026-03-01', 'descricao' => 'x', 'severidade' => 'baixa'])->id,
            PreConselho::class => $ficha->id,
            PreConselhoAluno::class => PreConselhoAluno::create(['pre_conselho_id' => $ficha->id, 'aluno_id' => $aluno->id, 'nivel_atencao' => 'baixo'])->id,
            Cronograma::class => Cronograma::create(['ano_letivo' => 2026, 'periodo' => 1, 'data_inicio' => '2026-04-13', 'data_fim' => '2026-04-23'])->id,
            Ata::class => Ata::create(['turma_id' => $turma->id, 'ano_letivo' => 2026, 'periodo' => 1, 'data_reuniao' => '2026-04-30', 'status' => 'rascunho'])->id,
            Frequencia::class => Frequencia::create(['turma_id' => $turma->id, 'aluno_id' => $aluno->id, 'data' => '2026-03-02', 'presenca' => 'presente'])->id,
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Pedagogico\Models\Nota;
use Modules\Pedagogico\Tests\Concerns\CenarioPedagogico;
use Modules\Pedagogico\Tests\TestCase;

/** Tarefas 3.3 e 3.4 — escopo do professor e notas. */
final class ProfessorNotaTest extends TestCase
{
    use CenarioPedagogico;
    use RefreshDatabase;

    public function test_professor_so_lanca_na_propria_turma_e_materia(): void
    {
        $tenant = $this->criarTenant();
        $seisA = $this->turma($tenant, '6º A');
        $seteB = $this->turma($tenant, '7º B');
        $mat = $this->materia($tenant, 'Matemática');
        $professor = $this->usuario($tenant, ['pedagogico_professor'], 'Prof Mat');
        $this->vincular($tenant, $seisA, $mat, $professor);
        $this->vincular($tenant, $seteB, $mat);
        $alunoSeisA = $this->aluno($tenant, $seisA, 'Da 6A');
        $alunoSeteB = $this->aluno($tenant, $seteB, 'Da 7B');

        $this->como($professor, $tenant)->putJson('/api/pedagogico/notas', [
            'turma_id' => $seisA->id, 'materia_id' => $mat->id, 'ano_letivo' => 2026, 'trimestre' => 1,
            'notas' => [['aluno_id' => $alunoSeisA->id, 'nota' => 8.5]],
        ])->assertOk();

        $this->como($professor, $tenant)->putJson('/api/pedagogico/notas', [
            'turma_id' => $seteB->id, 'materia_id' => $mat->id, 'ano_letivo' => 2026, 'trimestre' => 1,
            'notas' => [['aluno_id' => $alunoSeteB->id, 'nota' => 8.5]],
        ])->assertStatus(403);

        $this->como($professor, $tenant)->getJson("/api/pedagogico/turmas/{$seteB->id}/alunos")->assertStatus(403);
        $this->como($professor, $tenant)->getJson("/api/pedagogico/turmas/{$seisA->id}/alunos")->assertOk()->assertJsonCount(1);
    }

    public function test_minhas_turmas_lista_so_os_vinculos_do_professor(): void
    {
        $tenant = $this->criarTenant();
        $professor = $this->usuario($tenant, ['pedagogico_professor']);
        $this->vincular($tenant, $this->turma($tenant, '6º A'), $this->materia($tenant, 'Matemática'), $professor);
        $this->vincular($tenant, $this->turma($tenant, '7º B'), $this->materia($tenant, 'Geografia'));

        $this->como($professor, $tenant)->getJson('/api/pedagogico/minhas-turmas')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.turma', '6º A')->assertJsonPath('0.materia', 'Matemática');
        $this->como($professor, $tenant)->getJson('/api/pedagogico/turmas')->assertOk()->assertJsonCount(1);
    }

    public function test_nota_fora_da_escala_e_relancamento(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $mat = $this->materia($tenant);
        $aluno = $this->aluno($tenant, $turma, 'Aluno');
        $direcao = $this->usuario($tenant);
        $lote = fn ($nota): array => ['turma_id' => $turma->id, 'materia_id' => $mat->id, 'ano_letivo' => 2026, 'trimestre' => 1, 'notas' => [['aluno_id' => $aluno->id, 'nota' => $nota]]];

        $this->como($direcao, $tenant)->putJson('/api/pedagogico/notas', $lote(10.5))->assertStatus(422)->assertJsonValidationErrors('notas.0.nota');
        $this->como($direcao, $tenant)->putJson('/api/pedagogico/notas', $lote(7.25))->assertStatus(422);
        $this->como($direcao, $tenant)->putJson('/api/pedagogico/notas', $lote(6.0))->assertOk();
        $this->como($direcao, $tenant)->putJson('/api/pedagogico/notas', $lote(7.5))->assertOk();

        $this->noTenant($tenant, function (): void {
            $this->assertSame(1, Nota::count());
            $this->assertSame('7.5', Nota::firstOrFail()->nota);
        });
        $log = AuditLog::query()->where('action', 'nota.lancada')->latest('id')->firstOrFail();
        $this->assertSame('6.0', $log->before['nota']);
        $this->assertSame('7.5', $log->after['nota']);
        $this->assertTrue(OutboxEvent::query()->where('event_type', 'pedagogico.nota.lancada')->exists());
    }

    public function test_importacao_csv_rejeita_aluno_inexistente(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant, '6º A');
        $this->vincular($tenant, $turma, $this->materia($tenant, 'Matemática'));
        $this->aluno($tenant, $turma, 'Numero Um');
        $csv = UploadedFile::fake()->createWithContent('notas.csv', "TURMA;NUMERO;MATERIA;TRIMESTRE;NOTA\n6º A;1;Matemática;1;8,5\n6º A;99;Matemática;1;7\n");

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/pedagogico/notas/importar', ['arquivo' => $csv, 'ano_letivo' => 2026])
            ->assertOk()->assertJsonPath('importadas', 1)->assertJsonPath('rejeitadas.0.linha', 3);
        $this->assertSame('8.5', $this->noTenant($tenant, fn () => Nota::firstOrFail()->nota));
    }

    public function test_importacao_csv_ignora_nota_em_branco_e_rejeita_materia_fora_da_turma(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant, '6º A');
        $this->vincular($tenant, $turma, $this->materia($tenant, 'Matemática'));
        $this->materia($tenant, 'Inglês');
        $this->aluno($tenant, $turma, 'Numero Um');
        $csv = UploadedFile::fake()->createWithContent('notas.csv', "TURMA,NUMERO,MATERIA,TRIMESTRE,NOTA\n6º A,1,Matemática,2,\n6º A,1,Inglês,1,9\n6º A,1,Matemática,1,7\n");

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/pedagogico/notas/importar', ['arquivo' => $csv, 'ano_letivo' => 2026])
            ->assertOk()->assertJsonPath('importadas', 1)->assertJsonCount(1, 'rejeitadas')
            ->assertJsonPath('rejeitadas.0.linha', 3)
            ->assertJsonPath('rejeitadas.0.motivo', 'A matéria "Inglês" não está vinculada à turma 6º A.');
        $this->assertSame(1, $this->noTenant($tenant, fn () => Nota::count()));
    }
}

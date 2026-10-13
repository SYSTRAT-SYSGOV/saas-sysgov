<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Pedagogico\Models\PreConselhoAluno;
use Modules\Pedagogico\Tests\Concerns\CenarioPedagogico;
use Modules\Pedagogico\Tests\TestCase;

/** Tarefas 3.5 a 3.8 — ocorrências, pré-conselho, cronograma, atas e frequência. */
final class OcorrenciaConselhoTest extends TestCase
{
    use CenarioPedagogico;
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_categoria_excluida_continua_na_ocorrencia_e_total_por_aluno(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->aluno($tenant, $this->turma($tenant), 'Aluno');
        $categoria = $this->categoria($tenant, 'Uniforme');
        $direcao = $this->usuario($tenant);

        $id = $this->como($direcao, $tenant)->postJson('/api/pedagogico/ocorrencias', [
            'aluno_id' => $aluno->id, 'categoria_id' => $categoria->id, 'data' => '2026-03-10', 'descricao' => 'Sem uniforme', 'severidade' => 'baixa',
        ])->assertCreated()->json('id');
        $this->noTenant($tenant, fn () => CategoriaOcorrencia::findOrFail($categoria->id)->delete());

        $this->como($direcao, $tenant)->getJson("/api/pedagogico/ocorrencias/{$id}")->assertOk()->assertJsonPath('categoria.nome', 'Uniforme');
        $this->como($direcao, $tenant)->getJson('/api/pedagogico/ocorrencias/totais')->assertOk()->assertJsonPath('0.total', 1);
    }

    public function test_anexo_com_mime_invalido_e_rejeitado(): void
    {
        Storage::fake('local');
        $tenant = $this->criarTenant();
        $aluno = $this->aluno($tenant, $this->turma($tenant), 'Aluno');
        $caminho = tempnam(sys_get_temp_dir(), 'anx');
        file_put_contents($caminho, "MZ\x90\x00 executável disfarçado");

        $this->como($this->usuario($tenant), $tenant)->postJson('/api/pedagogico/ocorrencias', [
            'aluno_id' => $aluno->id, 'categoria_id' => $this->categoria($tenant)->id, 'data' => '2026-03-10', 'descricao' => 'x', 'severidade' => 'alta',
            'anexo' => new UploadedFile($caminho, 'laudo.pdf', null, null, true),
        ])->assertStatus(422)->assertJsonValidationErrors('anexo');
    }

    public function test_ficha_e_atualizada_e_textos_ficam_no_aluno_certo(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $mat = $this->materia($tenant);
        $a1 = $this->aluno($tenant, $turma, 'Primeiro');
        $transferido = $this->aluno($tenant, $turma, 'Transferido', ['situacao' => 'transferido']);
        $a3 = $this->aluno($tenant, $turma, 'Terceiro');
        $direcao = $this->usuario($tenant);
        $ficha = fn (string $desempenho): array => [
            'turma_id' => $turma->id, 'materia_id' => $mat->id, 'ano_letivo' => 2026, 'periodo' => 1,
            'data_registro' => '2026-04-15', 'desempenho_geral' => $desempenho,
            'alunos' => [
                ['aluno_id' => $a1->id, 'nivel_atencao' => 'alto', 'dificuldade' => 'Dificuldade do primeiro'],
                ['aluno_id' => $transferido->id, 'nivel_atencao' => 'baixo'],
                ['aluno_id' => $a3->id, 'nivel_atencao' => 'medio', 'dificuldade' => 'Dificuldade do terceiro'],
            ],
        ];

        $id = $this->como($direcao, $tenant)->putJson('/api/pedagogico/pre-conselhos', $ficha('bom'))->assertOk()->json('id');
        $this->como($direcao, $tenant)->putJson('/api/pedagogico/pre-conselhos', $ficha('regular'))->assertOk()->assertJsonPath('id', $id)->assertJsonPath('desempenho_geral', 'regular');

        $this->noTenant($tenant, function () use ($a1, $a3, $transferido): void {
            $this->assertSame('Dificuldade do primeiro', PreConselhoAluno::where('aluno_id', $a1->id)->value('dificuldade'));
            $this->assertSame('Dificuldade do terceiro', PreConselhoAluno::where('aluno_id', $a3->id)->value('dificuldade'));
            $this->assertNull(PreConselhoAluno::where('aluno_id', $transferido->id)->value('dificuldade'));
            $this->assertSame(3, PreConselhoAluno::count());
        });
    }

    public function test_progresso_do_pre_conselho(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $materias = [];
        for ($i = 1; $i <= 7; $i++) {
            $materias[] = $m = $this->materia($tenant, "Matéria {$i}");
            $this->vincular($tenant, $turma, $m);
        }
        $direcao = $this->usuario($tenant);
        foreach (array_slice($materias, 0, 2) as $m) {
            $this->como($direcao, $tenant)->putJson('/api/pedagogico/pre-conselhos', [
                'turma_id' => $turma->id, 'materia_id' => $m->id, 'ano_letivo' => 2026, 'periodo' => 1,
                'data_registro' => '2026-04-15', 'desempenho_geral' => 'bom', 'alunos' => [],
            ])->assertOk();
        }

        $this->como($direcao, $tenant)->getJson('/api/pedagogico/pre-conselhos/progresso?ano_letivo=2026&periodo=1')
            ->assertOk()->assertJsonPath('0.entregues', 2)->assertJsonPath('0.total', 7);
    }

    public function test_cronograma_fora_do_ano_e_periodo_vigente(): void
    {
        Carbon::setTestNow('2026-09-27 09:00:00');
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);

        $this->como($direcao, $tenant)->postJson('/api/pedagogico/cronogramas', ['ano_letivo' => 2026, 'periodo' => 1, 'data_inicio' => '2025-12-20', 'data_fim' => '2026-01-10'])
            ->assertStatus(422)->assertJsonValidationErrors('data_inicio');
        $this->como($direcao, $tenant)->postJson('/api/pedagogico/cronogramas', ['ano_letivo' => 2026, 'periodo' => 1, 'data_inicio' => '2026-04-13', 'data_fim' => '2026-04-23'])->assertCreated()->assertJsonPath('situacao', 'encerrado');
        $this->como($direcao, $tenant)->postJson('/api/pedagogico/cronogramas', ['ano_letivo' => 2026, 'periodo' => 2, 'data_inicio' => '2026-05-01', 'data_fim' => '2026-05-08'])->assertCreated();

        $this->como($direcao, $tenant)->getJson('/api/pedagogico/cronogramas/vigente')->assertOk()->assertJsonPath('data_fim', '2026-05-08');
    }

    public function test_ata_finalizada_nao_e_editada_e_frequencia_sem_data_futura(): void
    {
        Carbon::setTestNow('2026-09-27 09:00:00');
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $aluno = $this->aluno($tenant, $turma, 'Aluno');
        $direcao = $this->usuario($tenant);

        $ata = $this->como($direcao, $tenant)->postJson('/api/pedagogico/atas', ['turma_id' => $turma->id, 'ano_letivo' => 2026, 'periodo' => 1, 'data_reuniao' => '2026-04-30'])
            ->assertCreated()->assertJsonPath('status', 'rascunho')->json('id');
        $this->como($direcao, $tenant)->postJson("/api/pedagogico/atas/{$ata}/finalizar")->assertOk()->assertJsonPath('status', 'finalizada');
        $this->como($direcao, $tenant)->putJson("/api/pedagogico/atas/{$ata}", ['deliberacoes' => 'Alterado'])->assertStatus(422)->assertJsonPath('error', 'A ata está finalizada e não pode ser editada.');
        $this->como($direcao, $tenant)->postJson("/api/pedagogico/atas/{$ata}/arquivar")->assertOk()->assertJsonPath('status', 'arquivada');

        $this->como($direcao, $tenant)->putJson('/api/pedagogico/frequencias', ['turma_id' => $turma->id, 'data' => '2026-09-28', 'registros' => [['aluno_id' => $aluno->id, 'presenca' => 'presente']]])
            ->assertStatus(422)->assertJsonValidationErrors('data');
        $this->como($direcao, $tenant)->putJson('/api/pedagogico/frequencias', ['turma_id' => $turma->id, 'data' => '2026-09-27', 'registros' => [['aluno_id' => $aluno->id, 'presenca' => 'falta']]])->assertOk();
        $this->como($direcao, $tenant)->putJson('/api/pedagogico/frequencias', ['turma_id' => $turma->id, 'data' => '2026-09-27', 'registros' => [['aluno_id' => $aluno->id, 'presenca' => 'presente']]])->assertOk();
        $this->como($direcao, $tenant)->getJson("/api/pedagogico/frequencias?turma_id={$turma->id}&data=2026-09-27")
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.presenca', 'presente');
    }
}

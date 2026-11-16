<?php

declare(strict_types=1);

namespace Modules\Parecer\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Parecer\Models\Frequencia;
use Modules\Parecer\Models\Nota;
use Modules\Parecer\Tests\Concerns\CenarioParecer;
use Modules\Parecer\Tests\TestCase;

/** Regras de nota por série, frequência, ocorrências, impressão do parecer, conteúdos e relatórios. */
final class NotasFrequenciaImpressaoTest extends TestCase
{
    use CenarioParecer;
    use RefreshDatabase;

    public function test_primeiro_ano_nao_tem_nota(): void
    {
        $t = $this->criarTenant();
        $turma = $this->turma($t, '1º A', 1);
        $aluno = $this->aluno($t, $turma, 'Ana');

        $this->como($this->usuario($t), $t)->putJson('/api/parecer/notas', ['turma_id' => $turma->id, 'materia' => 'LP', 'notas' => [$aluno->id => [1 => 8]]])
            ->assertUnprocessable();
    }

    public function test_segundo_ano_so_grava_o_terceiro_trimestre(): void
    {
        $t = $this->criarTenant();
        $turma = $this->turma($t, '2º A', 2);
        $aluno = $this->aluno($t, $turma, 'Bia');

        $this->como($this->usuario($t), $t)->putJson('/api/parecer/notas', ['turma_id' => $turma->id, 'materia' => 'MAT', 'notas' => [$aluno->id => [1 => 5, 3 => 7.5]]])
            ->assertOk()->assertJsonPath('gravadas', 1);
        $this->noTenant($t, fn () => $this->assertSame([3], Nota::query()->pluck('trimestre')->all()));
    }

    public function test_importa_notas_por_planilha_pelo_cgm_ou_nome(): void
    {
        $t = $this->criarTenant();
        $turma = $this->turma($t, '4º A', 4);
        $this->aluno($t, $turma, 'Carlos Lima', ['cgm' => '123']);
        $this->aluno($t, $turma, 'Dora Souza');
        $csv = "cgm;nome;nota_1tri;nota_2tri;nota_3tri\n123;;7,5;;\n;DORA SOUZA;9;10;\n;Fulano;5;;\n";

        $this->como($this->usuario($t), $t)->post('/api/parecer/notas/importar', ['turma_id' => $turma->id, 'materia' => 'LP', 'arquivo' => UploadedFile::fake()->createWithContent('notas.csv', $csv)])
            ->assertOk()->assertJsonPath('gravadas', 3)->assertJsonPath('erros.0', 'linha 4: aluno não encontrado na turma');
    }

    public function test_chamada_conta_as_aulas_do_dia_nas_faltas(): void
    {
        $t = $this->criarTenant();
        $prof = $this->usuario($t, ['parecer_professor']);
        $turma = $this->turma($t, '3º A', 3, ['professor_regente' => $prof]);
        $ana = $this->aluno($t, $turma, 'Ana');
        $bia = $this->aluno($t, $turma, 'Bia');
        $ontem = date('Y-m-d', strtotime('-1 day'));

        $this->como($prof, $t)->putJson('/api/parecer/frequencias', ['turma_id' => $turma->id, 'data' => $ontem, 'aulas' => 4, 'faltaram' => [$bia->id]])->assertOk()->assertJsonPath('faltas', 1);
        $this->noTenant($t, function () use ($ana, $bia): void {
            $this->assertSame('C', Frequencia::query()->where('aluno_id', $ana->id)->value('status'));
            $this->assertSame(4, Frequencia::query()->where('aluno_id', $bia->id)->value('faltas'));
        });
        // Professor não apaga a chamada; gestor apaga.
        $this->como($prof, $t)->deleteJson('/api/parecer/frequencias', ['turma_id' => $turma->id, 'data' => $ontem])->assertForbidden();
        $this->como($this->usuario($t), $t)->deleteJson('/api/parecer/frequencias', ['turma_id' => $turma->id, 'data' => $ontem])->assertOk()->assertJsonPath('apagados', 2);
    }

    public function test_ocorrencia_so_quem_registrou_ou_gestor_altera(): void
    {
        $t = $this->criarTenant();
        $p1 = $this->usuario($t, ['parecer_professor'], 'Prof Um');
        $p2 = $this->usuario($t, ['parecer_professor'], 'Prof Dois');
        $turma = $this->turma($t, '5º A', 5, ['professor_regente' => $p1, 'professor_arte' => $p2]);
        $aluno = $this->aluno($t, $turma, 'Gil');
        $cat = $this->categoria($t);

        $id = $this->como($p1, $t)->postJson('/api/parecer/ocorrencias', ['aluno_id' => $aluno->id, 'data' => date('Y-m-d'), 'categoria_id' => $cat->id, 'descricao' => 'conversou durante a aula'])
            ->assertCreated()->assertJsonPath('descricao', 'Conversou durante a aula')->json('id');
        $this->como($p2, $t)->deleteJson("/api/parecer/ocorrencias/{$id}")->assertForbidden();
        $this->como($p1, $t)->deleteJson("/api/parecer/ocorrencias/{$id}")->assertOk();
    }

    public function test_parecer_da_turma_tem_texto_corrido_e_ignora_transferidos(): void
    {
        $t = $this->criarTenant();
        $regente = $this->usuario($t, ['parecer_professor'], 'Maria Regente');
        $turma = $this->turma($t, '3º A', 3, ['professor_regente' => $regente]);
        $ana = $this->aluno($t, $turma, 'Ana');
        $this->aluno($t, $turma, 'Saiu', ['situacao' => 'transferido']);
        $this->habilidade($t, 3, 'LP', 'Lê textos curtos.', '12');
        $this->habilidade($t, 3, 'LP', 'Escreve com letra cursiva.', '2');
        $this->habilidade($t, 3, 'MAT', 'Soma até 100.', '3');
        $this->como($regente, $t)->putJson("/api/parecer/alunos/{$ana->id}/avaliacao", ['tri' => 2, 'materia' => 'LP', 'conceitos' => [], 'observacao' => 'muito dedicada.'])->assertOk();

        $resp = $this->como($regente, $t)->getJson("/api/parecer/impressao?turma_id={$turma->id}&tri=2&materias[]=LP&materias[]=MAT")->assertOk();
        $resp->assertJsonCount(1, 'folhas')
            ->assertJsonPath('folhas.0.paragrafos.0.texto', 'lê textos curtos, escreve com letra cursiva. Muito dedicada.')
            ->assertJsonCount(1, 'folhas.0.paragrafos'); // MAT só no 3º tri e sem observação
        $rotulos = array_column($resp->json('folhas.0.assinaturas'), 'rotulo');
        $this->assertContains('Professor(a) regente', $rotulos);
        $this->assertNotContains('Professor(a) de Arte', $rotulos);
        $this->assertContains('Diretor(a)', $rotulos);
        $this->assertSame('Maria Regente', $resp->json('folhas.0.assinaturas.0.nome'));

        $this->como($regente, $t)->getJson("/api/parecer/impressao?aluno_id={$ana->id}&tri=0")->assertOk()->assertJsonCount(3, 'folhas');
    }

    public function test_conteudos_so_gestor_edita_e_habilidade_avaliada_nao_e_excluida(): void
    {
        $t = $this->criarTenant();
        $prof = $this->usuario($t, ['parecer_professor']);
        $gestor = $this->usuario($t, ['parecer_pedagogia']);
        $turma = $this->turma($t, '3º A', 3, ['professor_regente' => $prof]);
        $aluno = $this->aluno($t, $turma, 'Ana');

        $this->como($prof, $t)->postJson('/api/parecer/habilidades', ['serie' => 3, 'materia' => 'LP', 'descricao' => 'Nova', 'trimestres' => [1]])->assertForbidden();
        $this->como($gestor, $t)->postJson('/api/parecer/habilidades', ['serie' => 3, 'materia' => 'LP', 'descricao' => 'Sem trimestre', 'trimestres' => []])->assertUnprocessable();
        $id = $this->como($gestor, $t)->postJson('/api/parecer/habilidades', ['serie' => 3, 'materia' => 'LP', 'descricao' => 'Interpreta  textos.', 'trimestres' => [1, 3]])
            ->assertCreated()->assertJsonPath('trimestres', '13')->assertJsonPath('descricao', 'Interpreta textos.')->json('id');
        $this->como($prof, $t)->putJson("/api/parecer/alunos/{$aluno->id}/avaliacao", ['tri' => 1, 'materia' => 'LP', 'conceitos' => [$id => 'A']])->assertOk();
        $this->como($gestor, $t)->deleteJson("/api/parecer/habilidades/{$id}")->assertUnprocessable();
        $this->como($prof, $t)->getJson('/api/parecer/habilidades?serie=3&materia=LP')->assertOk()->assertJsonPath('pode_editar', false);
    }

    public function test_relatorio_do_professor_fica_no_escopo_dele(): void
    {
        $t = $this->criarTenant();
        $arte = $this->usuario($t, ['parecer_professor']);
        $turma = $this->turma($t, '4º A', 4, ['professor_arte' => $arte]);
        $outra = $this->turma($t, '4º B', 4);
        $a1 = $this->aluno($t, $turma, 'Ana');
        $a2 = $this->aluno($t, $outra, 'Bia');
        $hArt = $this->habilidade($t, 4, 'ART', 'Pinta.');
        $hMat = $this->habilidade($t, 4, 'MAT', 'Conta.');
        $gestor = $this->usuario($t);
        $this->como($gestor, $t)->putJson("/api/parecer/alunos/{$a1->id}/avaliacao", ['tri' => 1, 'materia' => 'ART', 'conceitos' => [$hArt->id => 'A']])->assertOk();
        $this->como($gestor, $t)->putJson("/api/parecer/alunos/{$a1->id}/avaliacao", ['tri' => 1, 'materia' => 'MAT', 'conceitos' => [$hMat->id => 'NA']])->assertOk();
        $this->como($gestor, $t)->putJson("/api/parecer/alunos/{$a2->id}/avaliacao", ['tri' => 1, 'materia' => 'ART', 'conceitos' => [$hArt->id => 'EP']])->assertOk();

        $this->como($gestor, $t)->getJson('/api/parecer/relatorios')->assertOk()->assertJsonPath('geral.total', 3);
        $this->como($arte, $t)->getJson('/api/parecer/relatorios')->assertOk()->assertJsonPath('geral.total', 1)->assertJsonPath('geral.a', 1);
        $this->como($gestor, $t)->getJson("/api/parecer/relatorios?aluno={$a1->id}")->assertOk()->assertJsonPath('comparativo.outras', 1);
    }
}

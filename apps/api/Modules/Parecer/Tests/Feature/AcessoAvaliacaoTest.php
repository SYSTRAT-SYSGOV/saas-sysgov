<?php

declare(strict_types=1);

namespace Modules\Parecer\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Parecer\Models\Avaliacao;
use Modules\Parecer\Models\Observacao;
use Modules\Parecer\Tests\Concerns\CenarioParecer;
use Modules\Parecer\Tests\TestCase;

/** Escopo por função (como materiasDoUsuario do PHP), avaliação única e observação. */
final class AcessoAvaliacaoTest extends TestCase
{
    use CenarioParecer;
    use RefreshDatabase;

    public function test_professor_de_arte_nao_avalia_matematica(): void
    {
        $t = $this->criarTenant();
        $arte = $this->usuario($t, ['parecer_professor'], 'Prof Arte');
        $turma = $this->turma($t, '4º A', 4, ['professor_arte' => $arte]);
        $aluno = $this->aluno($t, $turma, 'Ana');
        $mat = $this->habilidade($t, 4, 'MAT', 'Resolve problemas.');
        $art = $this->habilidade($t, 4, 'ART', 'Desenha formas.');

        $this->como($arte, $t)->putJson("/api/parecer/alunos/{$aluno->id}/avaliacao", ['tri' => 1, 'materia' => 'MAT', 'conceitos' => [$mat->id => 'A']])->assertForbidden();
        $this->como($arte, $t)->putJson("/api/parecer/alunos/{$aluno->id}/avaliacao", ['tri' => 1, 'materia' => 'ART', 'conceitos' => [$art->id => 'EP']])->assertOk();
        $this->como($arte, $t)->getJson("/api/parecer/alunos/{$aluno->id}/avaliacao")->assertOk()->assertJsonPath('materias', ['ART']);
    }

    public function test_regente_cobre_as_materias_sem_professor_proprio(): void
    {
        $t = $this->criarTenant();
        $regente = $this->usuario($t, ['parecer_professor'], 'Regente');
        $ef = $this->usuario($t, ['parecer_professor'], 'Prof EF');
        $turma = $this->turma($t, '3º A', 3, ['professor_regente' => $regente, 'professor_educacao_fisica' => $ef]);
        $aluno = $this->aluno($t, $turma, 'Bia');

        $this->como($regente, $t)->getJson("/api/parecer/alunos/{$aluno->id}/avaliacao")->assertOk()
            ->assertJsonPath('materias', ['LP', 'MAT', 'CIE', 'HIS', 'GEO', 'ART', 'ER']);
    }

    public function test_professor_sem_funcao_na_turma_recebe_403_e_gestor_ve_tudo(): void
    {
        $t = $this->criarTenant();
        $prof = $this->usuario($t, ['parecer_professor']);
        $turma = $this->turma($t, '2º B', 2);
        $aluno = $this->aluno($t, $turma, 'Caio');

        $this->como($prof, $t)->getJson("/api/parecer/turmas/{$turma->id}/alunos")->assertForbidden();
        $this->como($prof, $t)->getJson('/api/parecer/turmas')->assertOk()->assertJsonCount(0, 'turmas');
        $this->como($this->usuario($t, ['parecer_pedagogia']), $t)->getJson("/api/parecer/alunos/{$aluno->id}/avaliacao")->assertOk()
            ->assertJsonCount(8, 'materias');
    }

    public function test_reavaliar_substitui_apagar_remove_e_audita(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t);
        $turma = $this->turma($t);
        $aluno = $this->aluno($t, $turma, 'Duda');
        $h = $this->habilidade($t, 3, 'LP', 'Lê com fluência.');
        $url = "/api/parecer/alunos/{$aluno->id}/avaliacao";

        $this->como($gestor, $t)->putJson($url, ['tri' => 1, 'materia' => 'LP', 'conceitos' => [$h->id => 'EP'], 'observacao' => 'ótimo progresso'])->assertOk()->assertJsonPath('mudancas', 1);
        $this->como($gestor, $t)->putJson($url, ['tri' => 1, 'materia' => 'LP', 'conceitos' => [$h->id => 'A']])->assertOk();

        $this->noTenant($t, function () use ($aluno, $h): void {
            $this->assertSame(1, Avaliacao::query()->count());
            $this->assertSame('A', Avaliacao::query()->where('aluno_id', $aluno->id)->where('habilidade_id', $h->id)->value('conceito'));
            $this->assertSame('Ótimo progresso', Observacao::query()->value('texto'));
        });
        $this->como($gestor, $t)->putJson($url, ['tri' => 1, 'materia' => 'LP', 'conceitos' => [$h->id => '']])->assertOk();
        $this->assertSame(0, $this->noTenant($t, fn (): int => Avaliacao::query()->count()));
        $this->assertGreaterThanOrEqual(3, AuditLog::query()->where('module', 'parecer')->where('action', 'avaliacao.salva')->count());
    }

    public function test_visao_geral_mostra_as_observacoes_dos_tres_trimestres(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t);
        $turma = $this->turma($t);
        $aluno = $this->aluno($t, $turma, 'Duda');
        $h = $this->habilidade($t, 3, 'LP', 'Lê com fluência.');
        $url = "/api/parecer/alunos/{$aluno->id}/avaliacao";

        $this->como($gestor, $t)->putJson($url, ['tri' => 1, 'materia' => 'LP', 'conceitos' => [$h->id => 'A'], 'observacao' => 'lê bem'])->assertOk();
        $this->como($gestor, $t)->putJson($url, ['tri' => 3, 'materia' => 'LP', 'conceitos' => [$h->id => 'A'], 'observacao' => 'escreve bem'])->assertOk();

        $this->como($gestor, $t)->getJson("{$url}?tri=0&materia=LP")->assertOk()
            ->assertJsonPath('observacoes.1', 'Lê bem')
            ->assertJsonPath('observacoes.3', 'Escreve bem')
            ->assertJsonMissingPath('observacoes.2');
        $this->como($gestor, $t)->getJson("{$url}?tri=1&materia=LP")->assertOk()->assertJsonPath('observacoes', null);
    }

    public function test_conceito_invalido_e_rejeitado(): void
    {
        $t = $this->criarTenant();
        $aluno = $this->aluno($t, $this->turma($t), 'Eva');
        $h = $this->habilidade($t, 3, 'LP', 'Escreve.');

        $this->como($this->usuario($t), $t)->putJson("/api/parecer/alunos/{$aluno->id}/avaliacao", ['tri' => 1, 'materia' => 'LP', 'conceitos' => [$h->id => 'B']])->assertUnprocessable();
    }

    public function test_auditoria_so_para_quem_tem_permissao(): void
    {
        $t = $this->criarTenant();
        $this->como($this->usuario($t, ['parecer_pedagogia']), $t)->getJson('/api/parecer/auditoria')->assertForbidden();
        $this->como($this->usuario($t, ['parecer_direcao']), $t)->getJson('/api/parecer/auditoria')->assertOk();
    }
}

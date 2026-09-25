<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Services\QuestaoService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 3.3 — avaliações do curso.
 */
final class AvaliacaoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private User $aluno;

    private Curso $curso;

    /** @var list<Questao> */
    private array $questoes = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');
        $this->curso = $this->cursoPublicado($this->tenant);
        $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
        $this->questoes = [$this->novaQuestao($this->curso, 'Q1'), $this->novaQuestao($this->curso, 'Q2'), $this->novaQuestao($this->curso, 'Q3')];
    }

    private function novaQuestao(Curso $curso, string $enunciado): Questao
    {
        return $this->noTenant($this->tenant, fn (): Questao => app(QuestaoService::class)->criar($curso, [
            'tipo' => 'objetiva', 'enunciado' => "<p>{$enunciado}</p>",
            'alternativas' => [['texto' => 'A', 'correta' => true], ['texto' => 'B']],
        ]));
    }

    private function base(?Curso $curso = null): string
    {
        return '/api/cursos/cursos/' . ($curso ?? $this->curso)->id . '/avaliacoes';
    }

    /** @return list<int> */
    private function ids(int ...$posicoes): array
    {
        return array_map(fn (int $i): int => $this->questoes[$i]->id, $posicoes);
    }

    /**
     * @param array<string, mixed> $dados
     */
    private function avaliacao(array $dados = []): int
    {
        return (int) $this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova final', 'questoes' => $this->ids(0, 1), ...$dados])->assertCreated()->json('id');
    }

    private function registrarTentativa(int $avaliacaoId): void
    {
        $turma = $this->noTenant($this->tenant, fn () => \Modules\Cursos\Models\Turma::query()->firstOrFail());
        $inscricao = $this->inscrever($this->tenant, $turma, $this->aluno);
        $this->noTenant($this->tenant, fn () => Tentativa::create([
            'avaliacao_id' => $avaliacaoId, 'inscricao_id' => $inscricao->id, 'numero' => 1, 'status' => 'em_andamento', 'iniciada_em' => now(), 'questoes' => [],
        ]));
    }

    public function test_cria_avaliacao_com_questoes_em_ordem_e_valores_padrao(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova final', 'instrucoes' => '<p>Leia com atenção.</p>', 'questoes' => $this->ids(2, 0, 1)])
            ->assertCreated()
            ->assertJsonPath('titulo', 'Prova final')
            ->assertJsonPath('peso', 1)
            ->assertJsonPath('tentativas_max', 1)
            ->assertJsonPath('tempo_limite_minutos', null)
            ->assertJsonPath('publicada', false)
            ->assertJsonPath('liberacao_regra', 'imediata')
            ->assertJsonPath('questoes_count', 3)
            ->assertJsonPath('questoes.0.questao_id', $this->questoes[2]->id)
            ->assertJsonPath('questoes.1.questao_id', $this->questoes[0]->id)
            ->assertJsonPath('questoes.2.questao_id', $this->questoes[1]->id)
            ->assertJsonPath('questoes.0.ordem', 1);
    }

    public function test_avaliacao_em_evento_e_recusada(): void
    {
        $evento = $this->cursoPublicado($this->tenant, ['tipo' => 'evento', 'titulo' => 'Seminário']);

        $resposta = $this->como($this->admin, $this->tenant)->postJson($this->base($evento), ['titulo' => 'Prova']);

        $this->assertErroDeNegocio($resposta, 'Eventos não têm avaliação');
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Avaliacao::count()));
    }

    public function test_questao_de_outro_curso_e_recusada(): void
    {
        $outro = $this->cursoPublicado($this->tenant, ['titulo' => 'Outro curso']);
        $alheia = $this->novaQuestao($outro, 'Alheia');

        $resposta = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'questoes' => [$this->questoes[0]->id, $alheia->id]]);

        $this->assertErroDeNegocio($resposta, 'não pertencem ao banco deste curso');
    }

    public function test_questao_desativada_ou_repetida_nao_entra_na_avaliacao(): void
    {
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/questoes/{$this->questoes[1]->id}/desativar")->assertOk();

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'questoes' => $this->ids(0, 1)]), 'desativada');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'questoes' => $this->ids(0, 0)]), 'duas vezes');
    }

    public function test_limites_de_peso_tentativas_e_tempo(): void
    {
        foreach ([['peso' => 0], ['peso' => 11], ['tentativas_max' => 0], ['tentativas_max' => 11], ['tempo_limite_minutos' => 0]] as $invalido) {
            $this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', ...$invalido])->assertUnprocessable();
        }

        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'peso' => 10, 'tentativas_max' => 10, 'tempo_limite_minutos' => 90])
            ->assertCreated()->assertJsonPath('peso', 10)->assertJsonPath('tentativas_max', 10)->assertJsonPath('tempo_limite_minutos', 90);
    }

    public function test_regra_de_liberacao_das_avaliacoes_e_a_mesma_dos_materiais(): void
    {
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'liberacao_regra' => 'inicio_aula']), 'exige uma aula');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'liberacao_regra' => 'dias_apos_inicio']), '0 a 365');

        $aula = $this->aula($this->tenant, $this->curso);
        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'liberacao_regra' => 'inicio_aula', 'aula_id' => $aula->id])
            ->assertCreated()->assertJsonPath('aula_id', $aula->id);
    }

    public function test_instrucoes_sao_sanitizadas(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['titulo' => 'Prova', 'instrucoes' => '<p onclick="x()">Leia</p><script>alert(1)</script>'])
            ->assertCreated()->assertJsonPath('instrucoes', '<p>Leia</p>');
    }

    public function test_publica_so_com_ao_menos_uma_questao(): void
    {
        $vazia = $this->avaliacao(['questoes' => []]);
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$vazia}/publicar"), 'ao menos uma questão');

        $comQuestoes = $this->avaliacao();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$comQuestoes}/publicar")->assertOk()->assertJsonPath('publicada', true);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$comQuestoes}/despublicar")->assertOk()->assertJsonPath('publicada', false);
    }

    public function test_avaliacao_publicada_nao_fica_sem_questoes(): void
    {
        $id = $this->avaliacao();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$id}/publicar")->assertOk();

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/avaliacoes/{$id}", ['questoes' => []]), 'ao menos uma questão');
    }

    public function test_sem_tentativas_as_questoes_e_a_ordem_podem_mudar(): void
    {
        $id = $this->avaliacao();

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/avaliacoes/{$id}", ['questoes' => $this->ids(2, 1, 0)])
            ->assertOk()->assertJsonCount(3, 'questoes')->assertJsonPath('questoes.0.questao_id', $this->questoes[2]->id);
    }

    public function test_depois_da_primeira_tentativa_questoes_e_ordem_ficam_travadas(): void
    {
        $id = $this->avaliacao();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$id}/publicar")->assertOk();
        $this->registrarTentativa($id);
        $url = "/api/cursos/avaliacoes/{$id}";

        // Remover, acrescentar e reordenar são recusados.
        foreach ([$this->ids(0), $this->ids(0, 1, 2), $this->ids(1, 0)] as $lista) {
            $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson($url, ['questoes' => $lista]), 'já tem tentativas');
        }

        // Reenviar a mesma lista não muda nada e é aceito.
        $this->como($this->admin, $this->tenant)->putJson($url, ['questoes' => $this->ids(0, 1)])->assertOk();
    }

    public function test_depois_da_primeira_tentativa_nao_despublica_nem_exclui_mas_edita_o_resto(): void
    {
        $id = $this->avaliacao();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$id}/publicar")->assertOk();
        $this->registrarTentativa($id);

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$id}/despublicar"), 'já tem tentativas');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/avaliacoes/{$id}"), 'já tem tentativas');

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/avaliacoes/{$id}", ['titulo' => 'Prova final (revisada)', 'peso' => 3, 'tentativas_max' => 2, 'tempo_limite_minutos' => 45])
            ->assertOk()->assertJsonPath('titulo', 'Prova final (revisada)')->assertJsonPath('peso', 3)->assertJsonPath('tentativas_max', 2)->assertJsonPath('tempo_limite_minutos', 45)
            ->assertJsonPath('publicada', true)->assertJsonPath('tentativas_count', 1);
    }

    public function test_avaliacao_sem_tentativas_pode_ser_excluida(): void
    {
        $id = $this->avaliacao();

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/avaliacoes/{$id}")->assertOk();

        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Avaliacao::count()));
        $this->assertSame(3, $this->noTenant($this->tenant, fn () => Questao::count()), 'as questões continuam no banco');
    }

    public function test_questao_desativada_depois_continua_na_avaliacao_existente(): void
    {
        $id = $this->avaliacao();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/questoes/{$this->questoes[0]->id}/desativar")->assertOk();

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/avaliacoes/{$id}", ['titulo' => 'Renomeada', 'questoes' => $this->ids(0, 1)])->assertOk()->assertJsonCount(2, 'questoes');
    }

    public function test_instrutor_do_curso_ve_a_avaliacao_sem_as_questoes(): void
    {
        $id = $this->avaliacao();

        $this->como($this->instrutor, $this->tenant)->getJson($this->base())->assertOk()->assertJsonPath('0.questoes_count', 2)->assertJsonMissingPath('0.questoes');
        $resposta = $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/avaliacoes/{$id}")->assertOk()->assertJsonPath('titulo', 'Prova final');
        $resposta->assertJsonMissingPath('questoes');
        $this->assertStringNotContainsString('correta', $resposta->getContent());
    }

    public function test_so_o_administrador_gerencia_avaliacoes(): void
    {
        $id = $this->avaliacao();

        foreach ([$this->instrutor, $this->aluno] as $usuario) {
            $this->como($usuario, $this->tenant)->postJson($this->base(), ['titulo' => 'x'])->assertForbidden();
            $this->como($usuario, $this->tenant)->putJson("/api/cursos/avaliacoes/{$id}", ['titulo' => 'x'])->assertForbidden();
            $this->como($usuario, $this->tenant)->deleteJson("/api/cursos/avaliacoes/{$id}")->assertForbidden();
            $this->como($usuario, $this->tenant)->postJson("/api/cursos/avaliacoes/{$id}/publicar")->assertForbidden();
        }
        $this->como($this->aluno, $this->tenant)->getJson($this->base())->assertForbidden();
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/avaliacoes/{$id}")->assertForbidden();
    }

    public function test_instrutor_de_outro_curso_nao_ve_a_avaliacao(): void
    {
        $id = $this->avaliacao();
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Outro instrutor');

        $this->como($outroInstrutor, $this->tenant)->getJson("/api/cursos/avaliacoes/{$id}")->assertForbidden();
        $this->como($outroInstrutor, $this->tenant)->getJson($this->base())->assertForbidden();
    }

    public function test_avaliacao_de_outro_tenant_responde_404(): void
    {
        $id = $this->avaliacao();
        $tenantB = $this->criarTenant('prefeitura-b');
        $adminB = $this->usuario($tenantB, ['admin_cursos'], 'Admin B');

        $this->como($adminB, $tenantB)->getJson("/api/cursos/avaliacoes/{$id}")->assertNotFound();
        $this->como($adminB, $tenantB)->putJson("/api/cursos/avaliacoes/{$id}", ['titulo' => 'x'])->assertNotFound();
        $this->como($adminB, $tenantB)->deleteJson("/api/cursos/avaliacoes/{$id}")->assertNotFound();
        $this->como($adminB, $tenantB)->postJson("/api/cursos/avaliacoes/{$id}/publicar")->assertNotFound();
        $this->como($adminB, $tenantB)->getJson($this->base())->assertNotFound();
    }
}

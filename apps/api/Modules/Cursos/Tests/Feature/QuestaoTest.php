<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\AvaliacaoQuestao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Models\Resposta;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 3.2 — banco de questões do curso.
 */
final class QuestaoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private User $aluno;

    private Curso $curso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');
        $this->curso = $this->cursoPublicado($this->tenant);
    }

    private function base(): string
    {
        return "/api/cursos/cursos/{$this->curso->id}/questoes";
    }

    /**
     * @param array<string, mixed> $alteracoes
     * @return array<string, mixed>
     */
    private function objetiva(array $alteracoes = []): array
    {
        return [
            'tipo' => 'objetiva',
            'enunciado' => '<p>Qual é a capital do Paraná?</p>',
            'alternativas' => [
                ['texto' => 'Curitiba', 'correta' => true],
                ['texto' => 'Londrina', 'correta' => false],
                ['texto' => 'Maringá'],
            ],
            ...$alteracoes,
        ];
    }

    /**
     * @param array<string, mixed> $alteracoes
     */
    private function questao(array $alteracoes = []): Questao
    {
        $id = $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva($alteracoes))->assertCreated()->json('id');

        return $this->noTenant($this->tenant, fn () => Questao::query()->findOrFail($id));
    }

    public function test_cria_questao_objetiva_com_alternativas_em_ordem(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva())
            ->assertCreated()
            ->assertJsonPath('tipo', 'objetiva')
            ->assertJsonPath('ativa', true)
            ->assertJsonPath('pontuacao', '1.00')
            ->assertJsonPath('alternativas.0.texto', 'Curitiba')
            ->assertJsonPath('alternativas.0.correta', true)
            ->assertJsonPath('alternativas.2.texto', 'Maringá')
            ->assertJsonPath('alternativas.2.correta', false);
    }

    public function test_cria_questao_dissertativa_com_orientacao_de_correcao(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), [
            'tipo' => 'dissertativa', 'enunciado' => '<p>Explique o princípio da legalidade.</p>', 'pontuacao' => 2.5,
            'orientacao_correcao' => '<p>Citar o art. 37 da CF.</p>',
            'alternativas' => [['texto' => 'ignorada', 'correta' => true]],
        ])->assertCreated()->assertJsonPath('pontuacao', '2.50')->assertJsonPath('orientacao_correcao', '<p>Citar o art. 37 da CF.</p>')->assertJsonCount(0, 'alternativas');
    }

    public function test_orientacao_de_correcao_so_vale_para_dissertativa(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['orientacao_correcao' => '<p>segredo</p>']))
            ->assertCreated()->assertJsonPath('orientacao_correcao', null);
    }

    public function test_objetiva_sem_alternativa_correta_ou_com_duas_e_recusada(): void
    {
        $semCorreta = [['texto' => 'A', 'correta' => false], ['texto' => 'B', 'correta' => false]];
        $duasCorretas = [['texto' => 'A', 'correta' => true], ['texto' => 'B', 'correta' => true], ['texto' => 'C']];

        foreach ([$semCorreta, $duasCorretas] as $alternativas) {
            $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['alternativas' => $alternativas])), 'exatamente uma alternativa correta');
        }
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Questao::count()));
    }

    public function test_objetiva_exige_de_2_a_6_alternativas(): void
    {
        $uma = [['texto' => 'A', 'correta' => true]];
        $sete = array_map(fn (int $i): array => ['texto' => "Alt {$i}", 'correta' => $i === 0], range(0, 6));
        $seis = array_map(fn (int $i): array => ['texto' => "Alt {$i}", 'correta' => $i === 0], range(0, 5));

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['alternativas' => $uma])), '2 a 6');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['alternativas' => $sete])), '2 a 6');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['alternativas' => []])), '2 a 6');
        $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['alternativas' => $seis]))->assertCreated();
    }

    public function test_alternativa_sem_texto_e_pontuacao_invalida_sao_recusadas(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['alternativas' => [['texto' => '', 'correta' => true], ['texto' => 'B']]]))
            ->assertUnprocessable();
        $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['pontuacao' => 0]))->assertUnprocessable()->assertJsonValidationErrors('pontuacao');
        $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['pontuacao' => -1]))->assertUnprocessable();
    }

    public function test_enunciado_e_sanitizado_e_nao_pode_ficar_vazio(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['enunciado' => '<p onclick="x()">Pergunta</p><script>alert(1)</script>']))->assertCreated();
        $this->assertSame('<p>Pergunta</p>', $resposta->json('enunciado'));

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($this->base(), $this->objetiva(['enunciado' => '<script>x</script>'])), 'enunciado');
    }

    public function test_atualiza_enunciado_sem_mexer_nas_alternativas(): void
    {
        $questao = $this->questao();

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/questoes/{$questao->id}", ['enunciado' => '<p>Novo enunciado</p>', 'pontuacao' => 3])
            ->assertOk()->assertJsonPath('enunciado', '<p>Novo enunciado</p>')->assertJsonPath('pontuacao', '3.00')->assertJsonCount(3, 'alternativas');
    }

    public function test_atualiza_as_alternativas_revalidando_a_regra(): void
    {
        $questao = $this->questao();
        $url = "/api/cursos/questoes/{$questao->id}";

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson($url, ['alternativas' => [['texto' => 'A'], ['texto' => 'B']]]), 'exatamente uma alternativa correta');

        $this->como($this->admin, $this->tenant)->putJson($url, ['alternativas' => [['texto' => 'X', 'correta' => false], ['texto' => 'Y', 'correta' => true]]])
            ->assertOk()->assertJsonCount(2, 'alternativas')->assertJsonPath('alternativas.1.texto', 'Y')->assertJsonPath('alternativas.1.correta', true);
    }

    public function test_tipo_da_questao_nao_pode_ser_alterado(): void
    {
        $questao = $this->questao();

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/questoes/{$questao->id}", ['tipo' => 'dissertativa']), 'tipo da questão não pode ser alterado');
    }

    public function test_exclui_questao_nunca_respondida(): void
    {
        $questao = $this->questao();

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/questoes/{$questao->id}")->assertOk();

        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Questao::count()));
    }

    public function test_questao_ja_respondida_nao_pode_ser_excluida_mas_pode_ser_desativada(): void
    {
        $questao = $this->questao();
        $this->registrarResposta($questao);

        $resposta = $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/questoes/{$questao->id}");
        $this->assertErroDeNegocio($resposta, 'já foi respondida');
        $this->assertStringContainsString('Desative', (string) $resposta->json('error'));
        $this->assertSame(1, $this->noTenant($this->tenant, fn () => Questao::count()));

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/questoes/{$questao->id}/desativar")->assertOk()->assertJsonPath('ativa', false);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/questoes/{$questao->id}/ativar")->assertOk()->assertJsonPath('ativa', true);
    }

    public function test_questao_dentro_de_avaliacao_nao_pode_ser_excluida(): void
    {
        $questao = $this->questao();
        $this->noTenant($this->tenant, function () use ($questao): void {
            $avaliacao = Avaliacao::create(['curso_id' => $this->curso->id, 'titulo' => 'Prova']);
            AvaliacaoQuestao::create(['avaliacao_id' => $avaliacao->id, 'questao_id' => $questao->id, 'ordem' => 1]);
        });

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/questoes/{$questao->id}"), 'Retire-a da avaliação');
    }

    public function test_listagem_filtra_por_ativas(): void
    {
        $this->questao();
        $inativa = $this->questao(['enunciado' => '<p>Outra</p>']);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/questoes/{$inativa->id}/desativar")->assertOk();

        $this->como($this->admin, $this->tenant)->getJson($this->base())->assertOk()->assertJsonCount(2);
        $this->como($this->admin, $this->tenant)->getJson($this->base() . '?somente_ativas=1')->assertOk()->assertJsonCount(1);
    }

    public function test_so_o_administrador_acessa_o_banco_de_questoes(): void
    {
        $questao = $this->questao();

        foreach ([$this->instrutor, $this->aluno] as $usuario) {
            $this->como($usuario, $this->tenant)->getJson($this->base())->assertForbidden();
            $this->como($usuario, $this->tenant)->postJson($this->base(), $this->objetiva())->assertForbidden();
            $this->como($usuario, $this->tenant)->getJson("/api/cursos/questoes/{$questao->id}")->assertForbidden();
            $this->como($usuario, $this->tenant)->putJson("/api/cursos/questoes/{$questao->id}", ['pontuacao' => 5])->assertForbidden();
            $this->como($usuario, $this->tenant)->deleteJson("/api/cursos/questoes/{$questao->id}")->assertForbidden();
            $this->como($usuario, $this->tenant)->postJson("/api/cursos/questoes/{$questao->id}/desativar")->assertForbidden();
        }
    }

    public function test_questao_de_outro_tenant_responde_404(): void
    {
        $questao = $this->questao();
        $tenantB = $this->criarTenant('prefeitura-b');
        $adminB = $this->usuario($tenantB, ['admin_cursos'], 'Admin B');

        $this->como($adminB, $tenantB)->getJson("/api/cursos/questoes/{$questao->id}")->assertNotFound();
        $this->como($adminB, $tenantB)->putJson("/api/cursos/questoes/{$questao->id}", ['pontuacao' => 5])->assertNotFound();
        $this->como($adminB, $tenantB)->deleteJson("/api/cursos/questoes/{$questao->id}")->assertNotFound();
        $this->como($adminB, $tenantB)->postJson("/api/cursos/questoes/{$questao->id}/desativar")->assertNotFound();
        $this->como($adminB, $tenantB)->getJson($this->base())->assertNotFound();
    }

    private function registrarResposta(Questao $questao): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
        $inscricao = $this->inscrever($this->tenant, $turma, $this->aluno);
        $this->noTenant($this->tenant, function () use ($questao, $inscricao): void {
            $avaliacao = Avaliacao::create(['curso_id' => $this->curso->id, 'titulo' => 'Prova']);
            $tentativa = Tentativa::create(['avaliacao_id' => $avaliacao->id, 'inscricao_id' => $inscricao->id, 'numero' => 1, 'status' => 'corrigida', 'iniciada_em' => now(), 'questoes' => []]);
            Resposta::create(['tentativa_id' => $tentativa->id, 'questao_id' => $questao->id, 'alternativa_id' => $questao->alternativas()->first()?->id]);
        });
    }
}

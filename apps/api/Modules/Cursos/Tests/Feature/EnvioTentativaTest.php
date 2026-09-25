<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Models\Resposta;
use Modules\Cursos\Services\TentativaService;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 4.5 — envio, correção automática das objetivas e nota da tentativa.
 */
final class EnvioTentativaTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao();
    }

    /**
     * Responde as objetivas: cada item é [questão, índice da alternativa escolhida ou null para deixar em branco].
     *
     * @param list<array{Questao, int|null}> $escolhas
     */
    private function responderTodas(int $tentativaId, array $escolhas): void
    {
        foreach ($escolhas as [$questao, $indice]) {
            if ($indice !== null) {
                $this->responder($tentativaId, $questao, ['alternativa_id' => $this->alternativaId($questao, $indice)])->assertOk();
            }
        }
    }

    public function test_tentativa_so_com_objetivas_fica_corrigida_com_nota_7_50(): void
    {
        $questoes = array_map(fn (int $i): Questao => $this->criarObjetiva("Q{$i}", 1, correta: 0), [1, 2, 3, 4]);
        $avaliacao = $this->criarAvaliacaoPublicada($questoes);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');

        // Acerta 3 das 4 (a última fica errada).
        $this->responderTodas($id, [[$questoes[0], 0], [$questoes[1], 0], [$questoes[2], 0], [$questoes[3], 1]]);
        $this->enviarTentativa($id)->assertOk()
            ->assertJsonPath('status', 'corrigida')
            ->assertJsonPath('nota', '7.50')
            ->assertJsonPath('questoes.0.resultado.acertou', true)
            ->assertJsonPath('questoes.3.resultado.acertou', false);

        $this->assertSame(['pontos' => ['1.00', '1.00', '1.00', '0.00']], ['pontos' => Resposta::query()->orderBy('questao_id')->pluck('pontos')->all()]);
    }

    public function test_questao_sem_resposta_vale_zero(): void
    {
        $questoes = [$this->criarObjetiva('Q1'), $this->criarObjetiva('Q2')];
        $avaliacao = $this->criarAvaliacaoPublicada($questoes);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');

        $this->responderTodas($id, [[$questoes[0], 0], [$questoes[1], null]]);

        $this->enviarTentativa($id)->assertOk()->assertJsonPath('nota', '5.00')->assertJsonPath('questoes.1.resultado.pontos', 0)->assertJsonPath('questoes.1.resultado.acertou', false);
    }

    public function test_nota_pondera_pela_pontuacao_das_questoes(): void
    {
        $peso2 = $this->criarObjetiva('Vale 2', 2, correta: 0);
        $peso1 = $this->criarObjetiva('Vale 1', 1, correta: 0);
        $avaliacao = $this->criarAvaliacaoPublicada([$peso2, $peso1]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');

        $this->responderTodas($id, [[$peso2, 0], [$peso1, 1]]);

        // 2 de 3 pontos: 6,67.
        $this->enviarTentativa($id)->assertOk()->assertJsonPath('nota', '6.67');
    }

    public function test_tentativa_com_dissertativa_fica_aguardando_correcao(): void
    {
        $objetiva = $this->criarObjetiva();
        $dissertativa = $this->criarDissertativa();
        $avaliacao = $this->criarAvaliacaoPublicada([$objetiva, $dissertativa]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responderTodas($id, [[$objetiva, 0]]);
        $this->responder($id, $dissertativa, ['texto' => 'Minha resposta'])->assertOk();

        $this->enviarTentativa($id)->assertOk()->assertJsonPath('status', 'aguardando_correcao')->assertJsonPath('nota', null);

        $this->assertFalse(OutboxEvent::where('event_type', 'cursos.TentativaCorrigida')->exists());
        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $id);
    }

    public function test_dissertativa_em_branco_nao_espera_correcao(): void
    {
        $objetiva = $this->criarObjetiva();
        $dissertativa = $this->criarDissertativa();
        $avaliacao = $this->criarAvaliacaoPublicada([$objetiva, $dissertativa]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responderTodas($id, [[$objetiva, 0]]);
        $this->responder($id, $dissertativa, ['texto' => "  \n "])->assertOk();

        $this->enviarTentativa($id)->assertOk()->assertJsonPath('status', 'corrigida')->assertJsonPath('nota', '3.33');
    }

    public function test_envio_audita_o_conjunto_de_respostas_e_publica_os_eventos(): void
    {
        $questoes = [$this->criarObjetiva('Q1'), $this->criarObjetiva('Q2')];
        $avaliacao = $this->criarAvaliacaoPublicada($questoes);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responderTodas($id, [[$questoes[0], 0], [$questoes[1], 1]]);

        $this->enviarTentativa($id)->assertOk();

        $log = AuditLog::where('action', 'tentativa.enviada')->where('resource', "Tentativa #{$id}")->firstOrFail();
        $this->assertSame($this->aluno->id, $log->user_id);
        $this->assertSame('envio', $log->after['origem']);
        $this->assertSame('corrigida', $log->after['status']);
        $this->assertCount(2, $log->after['respostas']);
        $this->assertSame($this->alternativaId($questoes[1], 1), $log->after['respostas'][1]['alternativa_id']);

        $enviada = OutboxEvent::where('event_type', 'cursos.TentativaEnviada')->firstOrFail();
        $this->assertSame($id, $enviada->payload['id']);
        $this->assertSame('corrigida', $enviada->payload['status']);
        $corrigida = OutboxEvent::where('event_type', 'cursos.TentativaCorrigida')->firstOrFail();
        $this->assertEquals(5.0, (float) $corrigida->payload['nota']);
    }

    public function test_alterar_a_questao_depois_de_iniciar_nao_muda_a_correcao(): void
    {
        $questao = $this->criarObjetiva('Original', 1, correta: 0);
        $avaliacao = $this->criarAvaliacaoPublicada([$questao]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $escolhida = $this->alternativaId($questao, 0);
        $this->responder($id, $questao, ['alternativa_id' => $escolhida])->assertOk();

        // O Administrador recria as alternativas e muda a correta: a tentativa iniciada corrige pelo que foi mostrado.
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/questoes/{$questao->id}", [
            'alternativas' => [['texto' => 'Nova A'], ['texto' => 'Nova B', 'correta' => true]],
        ])->assertOk();

        $this->enviarTentativa($id)->assertOk()->assertJsonPath('nota', '10.00')->assertJsonPath('questoes.0.resultado.acertou', true);
    }

    public function test_nova_tentativa_usa_a_versao_atual_da_questao(): void
    {
        $questao = $this->criarObjetiva('Original');
        $avaliacao = $this->criarAvaliacaoPublicada([$questao], ['tentativas_max' => 2]);
        $primeira = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->enviarTentativa($primeira)->assertOk();

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/questoes/{$questao->id}", ['enunciado' => '<p>Revisado</p>'])->assertOk();

        $this->iniciarTentativa($avaliacao)->assertCreated()->assertJsonPath('questoes.0.enunciado', '<p>Revisado</p>');
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$primeira}")->assertJsonPath('questoes.0.enunciado', '<p>Original</p>');
    }

    public function test_arredondamento_da_nota_e_meio_para_cima(): void
    {
        $servico = app(TentativaService::class);
        $snapshot = [
            ['questao_id' => 1, 'pontuacao' => 69.95],
            ['questao_id' => 2, 'pontuacao' => 30.05],
        ];
        $respostas = new Collection([1 => new Resposta(['pontos' => '69.95']), 2 => new Resposta(['pontos' => '0'])]);

        // 69,95 de 100 = 6,995 → 7,00 (o mesmo que a pessoa lê na tela).
        $this->assertSame(7.0, $servico->calcularNota($snapshot, $respostas));
        $this->assertSame(0.0, $servico->calcularNota([], new Collection()));
        $this->assertSame(10.0, $servico->calcularNota([['questao_id' => 1, 'pontuacao' => 3.0]], new Collection([1 => new Resposta(['pontos' => '3'])])));
    }

    public function test_avaliacao_com_varias_tentativas_guarda_cada_nota(): void
    {
        $questao = $this->criarObjetiva();
        $avaliacao = $this->criarAvaliacaoPublicada([$questao], ['tentativas_max' => 2]);

        $primeira = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responderTodas($primeira, [[$questao, 1]]);
        $this->enviarTentativa($primeira)->assertOk()->assertJsonPath('nota', '0.00');

        $segunda = (int) $this->iniciarTentativa($avaliacao)->assertCreated()->assertJsonPath('numero', 2)->json('id');
        $this->responderTodas($segunda, [[$questao, 0]]);
        $this->enviarTentativa($segunda)->assertOk()->assertJsonPath('nota', '10.00');

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$primeira}")->assertJsonPath('nota', '0.00');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 4.3 — o gabarito não chega ao participante em nenhum estado
 * da tentativa (design D6).
 */
final class GabaritoNaoExpostoTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    private const SEGREDO = 'SEGREDO-DA-ORIENTACAO';

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao();
    }

    /** @return list<string> */
    private function chaves(mixed $dados): array
    {
        $chaves = [];
        if (is_array($dados)) {
            foreach ($dados as $chave => $valor) {
                $chaves[] = (string) $chave;
                $chaves = [...$chaves, ...$this->chaves($valor)];
            }
        }

        return $chaves;
    }

    /**
     * @param \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response> $resposta
     */
    private function assertSemGabarito($resposta, string $momento): void
    {
        $chaves = $this->chaves($resposta->json());
        $this->assertNotContains('correta', $chaves, "{$momento}: a chave `correta` vazou.");
        $this->assertNotContains('orientacao_correcao', $chaves, "{$momento}: a chave `orientacao_correcao` vazou.");
        $this->assertStringNotContainsString(self::SEGREDO, (string) $resposta->getContent(), "{$momento}: a orientação de correção vazou.");
    }

    public function test_a_saida_ao_participante_nunca_traz_o_gabarito_nem_a_orientacao(): void
    {
        $objetiva = $this->criarObjetiva('Objetiva', 1, correta: 1);
        $dissertativa = $this->criarDissertativa('Dissertativa', 2, self::SEGREDO);
        $avaliacao = $this->criarAvaliacaoPublicada([$objetiva, $dissertativa]);

        // em_andamento: início, leitura e salvamento
        $inicio = $this->iniciarTentativa($avaliacao)->assertCreated();
        $this->assertSemGabarito($inicio, 'ao iniciar');
        $id = $inicio->json('id');
        $this->assertSemGabarito($this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertOk(), 'em andamento (leitura)');
        $this->assertSemGabarito($this->responder($id, $objetiva, ['alternativa_id' => $this->alternativaId($objetiva, 0)])->assertOk(), 'ao salvar resposta');
        $this->responder($id, $dissertativa, ['texto' => 'Minha resposta'])->assertOk();

        // aguardando_correcao
        $enviada = $this->enviarTentativa($id)->assertOk()->assertJsonPath('status', 'aguardando_correcao');
        $this->assertSemGabarito($enviada, 'ao enviar');
        $aguardando = $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertOk();
        $this->assertSemGabarito($aguardando, 'aguardando correção');
        $this->assertNull($aguardando->json('nota'), 'antes da correção o participante não vê a nota');
        $this->assertNull($aguardando->json('questoes.0.resultado'), 'antes da correção o participante não vê o resultado');

        // corrigida
        $this->como($this->instrutor, $this->tenant)->putJson("/api/cursos/tentativas/{$id}/respostas/{$dissertativa->id}/correcao", ['pontos' => 2, 'comentario' => 'Muito bom'])->assertOk();
        $corrigida = $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertOk()->assertJsonPath('status', 'corrigida');
        $this->assertSemGabarito($corrigida, 'corrigida');
        $corrigida->assertJsonPath('questoes.0.resultado.acertou', false)
            ->assertJsonPath('questoes.0.resultado.pontos', 0)
            ->assertJsonPath('questoes.1.resultado.pontos', 2)
            ->assertJsonPath('questoes.1.resultado.comentario', 'Muito bom');
        $this->assertNotNull($corrigida->json('nota'));
    }

    public function test_a_saida_de_correcao_traz_o_gabarito_para_quem_corrige(): void
    {
        $objetiva = $this->criarObjetiva('Objetiva', 1, correta: 1);
        $dissertativa = $this->criarDissertativa('Dissertativa', 2, self::SEGREDO);
        $avaliacao = $this->criarAvaliacaoPublicada([$objetiva, $dissertativa]);
        $id = $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $dissertativa, ['texto' => 'Resposta']);
        $this->enviarTentativa($id)->assertOk();

        $correcao = $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/tentativas/{$id}/correcao")->assertOk();

        $this->assertContains('correta', $this->chaves($correcao->json()));
        $this->assertStringContainsString(self::SEGREDO, (string) $correcao->getContent());
        $correcao->assertJsonPath('questoes.0.alternativas.1.correta', true)->assertJsonPath('questoes.0.alternativas.0.correta', false);
    }

    public function test_o_model_da_tentativa_nunca_serializa_o_snapshot(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);
        $id = $this->iniciarTentativa($avaliacao)->json('id');

        $tentativa = $this->noTenant($this->tenant, fn () => \Modules\Cursos\Models\Tentativa::query()->findOrFail($id));

        $this->assertArrayNotHasKey('questoes', $tentativa->toArray());
        $this->assertStringNotContainsString('correta', $tentativa->toJson());
    }

    public function test_alterar_a_questao_no_banco_nao_altera_o_que_o_participante_ve(): void
    {
        $objetiva = $this->criarObjetiva('Enunciado original');
        $avaliacao = $this->criarAvaliacaoPublicada([$objetiva]);
        $id = $this->iniciarTentativa($avaliacao)->json('id');

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/questoes/{$objetiva->id}", [
            'enunciado' => '<p>Enunciado alterado</p>',
            'alternativas' => [['texto' => 'X', 'correta' => true], ['texto' => 'Y']],
        ])->assertOk();

        $leitura = $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertOk();
        $this->assertSame('<p>Enunciado original</p>', $leitura->json('questoes.0.enunciado'));
        $this->assertSame(['A', 'B', 'C'], array_column($leitura->json('questoes.0.alternativas'), 'texto'));
    }
}

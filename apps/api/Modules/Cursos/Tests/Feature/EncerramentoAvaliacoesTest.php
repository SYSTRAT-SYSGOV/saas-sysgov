<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 5.3 — o encerramento e as avaliações: correção pendente,
 * nota mínima sem avaliação, tentativas em andamento e imutabilidade.
 */
final class EncerramentoAvaliacoesTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao(curso: ['frequencia_minima' => 75]);
    }

    private function turmaEmDia(): void
    {
        $this->registrarPresencas($this->inscricao, $this->agendarAulasRealizadas(4), 4);
    }

    private function statusTurma(): string
    {
        return $this->noTenant($this->tenant, fn () => \Modules\Cursos\Models\Turma::query()->findOrFail($this->turma->id)->status);
    }

    public function test_encerramento_e_recusado_com_tentativa_aguardando_correcao_e_lista_as_pendentes(): void
    {
        $this->turmaEmDia();
        $dissertativa = $this->criarDissertativa('Explique', 2);
        $avaliacao = $this->criarAvaliacaoPublicada([$dissertativa], ['titulo' => 'Prova discursiva']);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $dissertativa, ['texto' => 'Minha resposta'])->assertOk();
        $this->enviarTentativa($id)->assertOk()->assertJsonPath('status', 'aguardando_correcao');

        $resposta = $this->encerrarTurma();

        $this->assertErroDeNegocio($resposta, '1 tentativa(s) aguardando correção');
        $this->assertStringContainsString('Aluno (Prova discursiva, tentativa 1)', (string) $resposta->json('error'));
        $this->assertSame('aberta', $this->statusTurma());
        $this->assertSame('confirmada', $this->noTenant($this->tenant, fn () => Inscricao::query()->findOrFail($this->inscricao->id)->status));

        // Corrigida a última pendência, o encerramento passa.
        $this->como($this->instrutor, $this->tenant)->putJson("/api/cursos/tentativas/{$id}/respostas/{$dissertativa->id}/correcao", ['pontos' => 2])->assertOk();
        $this->encerrarTurma()->assertOk();
        $this->assertSame('encerrada', $this->statusTurma());
    }

    public function test_recusa_lista_no_maximo_dez_e_conta_o_restante(): void
    {
        $this->turmaEmDia();
        $avaliacao = $this->avaliacaoDireta();
        for ($i = 1; $i <= 12; $i++) {
            $this->tentativaDireta($avaliacao, $this->inscricao, 'aguardando_correcao', null, numero: $i);
        }

        $resposta = $this->encerrarTurma();

        $this->assertErroDeNegocio($resposta, '12 tentativa(s) aguardando correção');
        $this->assertStringContainsString('e mais 2', (string) $resposta->json('error'));
    }

    public function test_nota_minima_sem_avaliacao_publicada_recusa_o_encerramento(): void
    {
        $this->turmaEmDia();
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}", ['nota_minima' => 7])->assertOk();

        $this->assertErroDeNegocio($this->encerrarTurma(), 'não tem avaliação publicada');

        $this->avaliacaoDireta(publicada: false);
        $this->assertErroDeNegocio($this->encerrarTurma(), 'não tem avaliação publicada');
        $this->assertSame('aberta', $this->statusTurma());

        $this->avaliacaoDireta(titulo: 'Publicada');
        $this->encerrarTurma()->assertOk();
    }

    public function test_curso_sem_nota_minima_encerra_mesmo_sem_avaliacao(): void
    {
        $this->turmaEmDia();

        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 1);
    }

    public function test_tentativa_em_andamento_e_enviada_com_o_que_foi_salvo_e_entra_na_nota(): void
    {
        $this->turmaEmDia();
        $q1 = $this->criarObjetiva('Q1');
        $q2 = $this->criarObjetiva('Q2');
        $avaliacao = $this->criarAvaliacaoPublicada([$q1, $q2]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $q1, ['alternativa_id' => $this->alternativaId($q1, 0)])->assertOk();
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}", ['nota_minima' => 5])->assertOk();

        $this->encerrarTurma()->assertOk()->assertJsonPath('concluidas', 1);

        $tentativa = $this->noTenant($this->tenant, fn () => Tentativa::query()->findOrFail($id));
        $this->assertSame('corrigida', $tentativa->status);
        $this->assertSame('5.00', $tentativa->nota);
        $this->assertNotNull($tentativa->enviada_em);
        $this->assertSame('5.00', $this->noTenant($this->tenant, fn () => Inscricao::query()->findOrFail($this->inscricao->id)->nota_apurada));
        $this->assertTrue(AuditLog::where('action', 'tentativa.enviada')->get()->contains(fn ($l) => ($l->after['origem'] ?? null) === 'encerramento'));
        $this->assertTrue(OutboxEvent::where('event_type', 'cursos.TentativaEnviada')->exists());
    }

    public function test_tentativa_em_andamento_com_dissertativa_fica_sem_correcao_e_conta_zero(): void
    {
        $this->turmaEmDia();
        $dissertativa = $this->criarDissertativa('Explique', 2);
        $avaliacao = $this->criarAvaliacaoPublicada([$dissertativa]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $dissertativa, ['texto' => 'Rascunho que ninguém enviou'])->assertOk();
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}", ['nota_minima' => 5])->assertOk();

        $this->encerrarTurma()->assertOk()->assertJsonPath('nao_concluidas', 1);

        $this->assertSame('aguardando_correcao', $this->noTenant($this->tenant, fn () => Tentativa::query()->findOrFail($id)->status));
        $this->assertSame('0.00', $this->noTenant($this->tenant, fn () => Inscricao::query()->findOrFail($this->inscricao->id)->nota_apurada));
    }

    public function test_depois_do_encerramento_tentativas_e_correcoes_ficam_imutaveis(): void
    {
        $this->turmaEmDia();
        $objetiva = $this->criarObjetiva();
        $dissertativa = $this->criarDissertativa('Explique', 2);
        $avaliacao = $this->criarAvaliacaoPublicada([$objetiva, $dissertativa], ['tentativas_max' => 3]);
        $id = (int) $this->iniciarTentativa($avaliacao)->json('id');
        $this->responder($id, $dissertativa, ['texto' => 'Resposta'])->assertOk();
        $this->enviarTentativa($id)->assertOk();
        $this->como($this->instrutor, $this->tenant)->putJson("/api/cursos/tentativas/{$id}/respostas/{$dissertativa->id}/correcao", ['pontos' => 1])->assertOk();

        $this->encerrarTurma()->assertOk();

        $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'inscrições confirmadas');
        $this->assertErroDeNegocio($this->responder($id, $objetiva, ['alternativa_id' => $this->alternativaId($objetiva, 0)]), 'já foi enviada');
        $this->assertErroDeNegocio($this->como($this->instrutor, $this->tenant)->putJson("/api/cursos/tentativas/{$id}/respostas/{$dissertativa->id}/correcao", ['pontos' => 2]), 'turma foi encerrada');
    }

    public function test_participante_sem_tentativa_fica_com_nota_zero_no_curso_com_nota_minima(): void
    {
        $this->turmaEmDia();
        $this->avaliacaoDireta();
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$this->curso->id}", ['nota_minima' => 1])->assertOk();

        $this->encerrarTurma()->assertOk()->assertJsonPath('nao_concluidas', 1);

        $this->assertSame('0.00', $this->noTenant($this->tenant, fn () => Inscricao::query()->findOrFail($this->inscricao->id)->nota_apurada));
    }
}

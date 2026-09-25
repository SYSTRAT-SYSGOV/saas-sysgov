<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 4.2 — início da tentativa.
 */
final class TentativaTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao();
    }

    protected function tearDown(): void
    {
        $this->liberarRelogio();
        parent::tearDown();
    }

    public function test_inicia_a_tentativa_com_as_questoes_em_ordem(): void
    {
        $q1 = $this->criarObjetiva('Primeira');
        $q2 = $this->criarDissertativa('Segunda');
        $avaliacao = $this->criarAvaliacaoPublicada([$q2, $q1]);

        $this->iniciarTentativa($avaliacao)->assertCreated()
            ->assertJsonPath('status', 'em_andamento')
            ->assertJsonPath('numero', 1)
            ->assertJsonPath('inscricao_id', $this->inscricao->id)
            ->assertJsonPath('prazo_em', null)
            ->assertJsonPath('avaliacao.titulo', 'Prova final')
            ->assertJsonCount(2, 'questoes')
            ->assertJsonPath('questoes.0.questao_id', $q2->id)
            ->assertJsonPath('questoes.1.questao_id', $q1->id)
            ->assertJsonPath('questoes.1.alternativas.0.texto', 'A');

        $this->assertTrue(AuditLog::where('action', 'tentativa.iniciada')->where('user_id', $this->aluno->id)->exists());
    }

    public function test_tempo_limite_grava_o_prazo(): void
    {
        $this->travarRelogio(now()->startOfMinute());
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()], ['tempo_limite_minutos' => 45]);

        $resposta = $this->iniciarTentativa($avaliacao)->assertCreated();

        $this->assertSame(now()->addMinutes(45)->toIso8601String(), $resposta->json('prazo_em'));
        $this->assertSame(now()->toIso8601String(), $resposta->json('servidor_agora'));
    }

    public function test_limite_de_tentativas(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()], ['tentativas_max' => 2]);

        foreach ([1, 2] as $numero) {
            $id = $this->iniciarTentativa($avaliacao)->assertCreated()->assertJsonPath('numero', $numero)->json('id');
            $this->enviarTentativa($id)->assertOk();
        }

        $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'limite de tentativas');
    }

    public function test_nao_inicia_outra_enquanto_ha_tentativa_em_andamento(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()], ['tentativas_max' => 3]);
        $this->iniciarTentativa($avaliacao)->assertCreated();

        $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'já tem uma tentativa em andamento');
    }

    public function test_avaliacao_ainda_nao_liberada_informa_a_data(): void
    {
        // A turma começou ontem: "5 dias após o início" libera daqui a 4 dias, à meia-noite.
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()], ['liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 5]);
        $data = now('America/Sao_Paulo')->addDays(4)->format('d/m/Y');

        $resposta = $this->iniciarTentativa($avaliacao);

        $this->assertErroDeNegocio($resposta, "será liberada em {$data} às 00:00");
    }

    public function test_avaliacao_com_aula_sem_agendamento_nao_inicia(): void
    {
        $aula = $this->aula($this->tenant, $this->curso);
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()], ['liberacao_regra' => 'inicio_aula', 'aula_id' => $aula->id]);

        $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'ainda não foi agendada');
    }

    public function test_avaliacao_com_aula_agendada_libera_no_horario(): void
    {
        $aula = $this->aula($this->tenant, $this->curso);
        $this->agendamento($this->tenant, $this->turma, $aula, now()->addHour());
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()], ['liberacao_regra' => 'inicio_aula', 'aula_id' => $aula->id]);

        $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'será liberada em');

        $this->travarRelogio(now()->addHour()->addMinute());
        $this->iniciarTentativa($avaliacao)->assertCreated();
    }

    public function test_turma_encerrada_ou_cancelada_recusa_a_tentativa(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);

        foreach (['encerrada', 'cancelada'] as $status) {
            $this->noTenant($this->tenant, fn () => Turma::query()->whereKey($this->turma->id)->update(['status' => $status]));
            $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'turma não está aberta');
        }
    }

    public function test_inscricao_que_nao_esta_confirmada_e_recusada(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);

        foreach (['pendente', 'lista_espera', 'cancelada', 'concluida', 'nao_concluida'] as $status) {
            $this->noTenant($this->tenant, fn () => Inscricao::query()->whereKey($this->inscricao->id)->update(['status' => $status]));
            $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'inscrições confirmadas');
        }
    }

    public function test_avaliacao_nao_publicada_nao_inicia(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/avaliacoes/{$avaliacao->id}/despublicar")->assertOk();

        $this->assertErroDeNegocio($this->iniciarTentativa($avaliacao), 'não está disponível');
    }

    public function test_so_o_dono_da_inscricao_inicia_a_tentativa(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);
        $outro = $this->usuario($this->tenant, ['participante_cursos'], 'Outro aluno');

        $this->iniciarTentativa($avaliacao, $outro)->assertForbidden();
        $this->iniciarTentativa($avaliacao, $this->admin)->assertForbidden();
        $this->iniciarTentativa($avaliacao, $this->instrutor)->assertForbidden();
    }

    public function test_inscricao_de_outro_curso_e_recusada(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);
        $outroCurso = $this->cursoPublicado($this->tenant, ['titulo' => 'Outro curso']);
        $outraTurma = $this->turmaAberta($this->tenant, $outroCurso, $this->instrutor);
        $outraInscricao = $this->inscrever($this->tenant, $outraTurma, $this->aluno);

        $this->iniciarTentativa($avaliacao, inscricao: $outraInscricao)->assertForbidden();
    }

    public function test_avaliacao_e_inscricao_de_outro_tenant_respondem_404(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);
        $tenantB = $this->criarTenant('prefeitura-b');
        $alunoB = $this->usuario($tenantB, ['participante_cursos'], 'Aluno B');

        $this->como($alunoB, $tenantB)->postJson("/api/cursos/avaliacoes/{$avaliacao->id}/tentativas", ['inscricao_id' => $this->inscricao->id])->assertNotFound();
    }

    public function test_inscricao_id_e_obrigatorio(): void
    {
        $avaliacao = $this->criarAvaliacaoPublicada([$this->criarObjetiva()]);

        $this->como($this->aluno, $this->tenant)->postJson("/api/cursos/avaliacoes/{$avaliacao->id}/tentativas", [])->assertUnprocessable();
    }
}

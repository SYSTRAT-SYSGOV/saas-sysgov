<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Questao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioAvaliacoes;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 4.6 — fila de correção, correção de dissertativas e permissões.
 */
final class CorrecaoTentativaTest extends TestCase
{
    use CenarioAvaliacoes;
    use RefreshDatabase;

    private Questao $objetiva;

    private Questao $dissertativa1;

    private Questao $dissertativa2;

    private Avaliacao $avaliacao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararCenarioAvaliacao();
        $this->objetiva = $this->criarObjetiva('Objetiva', 1, correta: 0);
        $this->dissertativa1 = $this->criarDissertativa('Dissertativa 1', 2);
        $this->dissertativa2 = $this->criarDissertativa('Dissertativa 2', 3);
        $this->avaliacao = $this->criarAvaliacaoPublicada([$this->objetiva, $this->dissertativa1, $this->dissertativa2]);
    }

    /** Tentativa enviada pelo aluno com a objetiva certa e as duas dissertativas respondidas. */
    private function tentativaEnviada(): int
    {
        $id = (int) $this->iniciarTentativa($this->avaliacao)->assertCreated()->json('id');
        $this->responder($id, $this->objetiva, ['alternativa_id' => $this->alternativaId($this->objetiva, 0)])->assertOk();
        $this->responder($id, $this->dissertativa1, ['texto' => 'Resposta 1'])->assertOk();
        $this->responder($id, $this->dissertativa2, ['texto' => 'Resposta 2'])->assertOk();
        $this->enviarTentativa($id)->assertOk()->assertJsonPath('status', 'aguardando_correcao');

        return $id;
    }

    /**
     * @param array<string, mixed> $dados
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function corrigir(int $id, Questao $questao, array $dados, ?\App\Models\User $como = null)
    {
        return $this->como($como ?? $this->instrutor, $this->tenant)->putJson("/api/cursos/tentativas/{$id}/respostas/{$questao->id}/correcao", $dados);
    }

    public function test_fila_lista_as_tentativas_aguardando_correcao_da_turma(): void
    {
        $id = $this->tentativaEnviada();

        $fila = $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertOk();

        $fila->assertJsonCount(1)->assertJsonPath('0.id', $id)->assertJsonPath('0.participante.nome', 'Aluno')->assertJsonPath('0.avaliacao.titulo', 'Prova final')
            ->assertJsonPath('0.pendentes', 2)->assertJsonPath('0.status', 'aguardando_correcao');
        $this->como($this->admin, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertOk()->assertJsonCount(1);
    }

    public function test_correcao_da_ultima_dissertativa_fecha_a_nota_audita_e_publica_o_evento(): void
    {
        $id = $this->tentativaEnviada();

        // Primeira dissertativa: ainda falta a segunda.
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 1.5, 'comentario' => 'Faltou citar o artigo'])->assertOk()
            ->assertJsonPath('status', 'aguardando_correcao')->assertJsonPath('nota', null)->assertJsonPath('questoes.1.correcao.pontos', 1.5)->assertJsonPath('questoes.1.correcao.pendente', false)
            ->assertJsonPath('questoes.2.correcao.pendente', true);
        $this->assertFalse(OutboxEvent::where('event_type', 'cursos.TentativaCorrigida')->exists());

        // Última: 1 (objetiva) + 1,5 + 3 = 5,5 de 6 → 9,17.
        $this->corrigir($id, $this->dissertativa2, ['pontos' => 3])->assertOk()->assertJsonPath('status', 'corrigida')->assertJsonPath('nota', '9.17');

        $log = AuditLog::where('action', 'tentativa.resposta_corrigida')->where('resource', "Tentativa #{$id} / questão #{$this->dissertativa2->id}")->firstOrFail();
        $this->assertSame($this->instrutor->id, $log->user_id);
        $this->assertEquals(3.0, (float) $log->after['pontos']);
        $this->assertNull($log->before['pontos']);

        $evento = OutboxEvent::where('event_type', 'cursos.TentativaCorrigida')->firstOrFail();
        $this->assertSame($id, $evento->payload['id']);
        $this->assertEquals(9.17, (float) $evento->payload['nota']);
        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertOk()->assertJsonCount(0);
    }

    public function test_pontos_acima_do_maximo_ou_negativos_sao_recusados(): void
    {
        $id = $this->tentativaEnviada();

        $this->assertErroDeNegocio($this->corrigir($id, $this->dissertativa1, ['pontos' => 3]), 'entre 0 e 2');
        $this->assertErroDeNegocio($this->corrigir($id, $this->dissertativa1, ['pontos' => -1]), 'entre 0 e 2');
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 'abc'])->assertUnprocessable();
        $this->corrigir($id, $this->dissertativa1, [])->assertUnprocessable();
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 0])->assertOk();
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 2])->assertOk();
    }

    public function test_revisao_recalcula_a_nota_e_publica_novo_evento(): void
    {
        $id = $this->tentativaEnviada();
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 2])->assertOk();
        $this->corrigir($id, $this->dissertativa2, ['pontos' => 3])->assertOk()->assertJsonPath('nota', '10.00');

        $this->corrigir($id, $this->dissertativa2, ['pontos' => 0, 'comentario' => 'Revisado'])->assertOk()->assertJsonPath('status', 'corrigida')->assertJsonPath('nota', '5.00');

        $this->assertSame(2, OutboxEvent::where('event_type', 'cursos.TentativaCorrigida')->count());
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertJsonPath('nota', '5.00')->assertJsonPath('questoes.2.resultado.comentario', 'Revisado');
    }

    public function test_instrutor_de_outra_turma_recebe_403(): void
    {
        $id = $this->tentativaEnviada();
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Outro instrutor');
        $this->turmaAberta($this->tenant, $this->curso, $outroInstrutor, ['nome' => 'Turma 2']);

        $this->corrigir($id, $this->dissertativa1, ['pontos' => 1], $outroInstrutor)->assertForbidden();
        $this->como($outroInstrutor, $this->tenant)->getJson("/api/cursos/tentativas/{$id}/correcao")->assertForbidden();
        $this->como($outroInstrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertForbidden();
        $this->assertNull($this->como($this->admin, $this->tenant)->getJson("/api/cursos/tentativas/{$id}/correcao")->json('questoes.1.correcao.pontos'));
    }

    public function test_participante_nao_corrige_nem_ve_a_fila(): void
    {
        $id = $this->tentativaEnviada();

        $this->corrigir($id, $this->dissertativa1, ['pontos' => 2], $this->aluno)->assertForbidden();
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/tentativas/{$id}/correcao")->assertForbidden();
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertForbidden();
    }

    public function test_participante_nao_ve_tentativa_de_outra_pessoa(): void
    {
        $id = $this->tentativaEnviada();
        $outro = $this->usuario($this->tenant, ['participante_cursos'], 'Outro aluno');
        $this->inscrever($this->tenant, $this->turma, $outro);

        $this->como($outro, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertForbidden();
        // Nem o instrutor nem o Administrador usam a rota do participante.
        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertForbidden();
        $this->como($this->admin, $this->tenant)->getJson("/api/cursos/tentativas/{$id}")->assertForbidden();
    }

    public function test_objetiva_nao_e_corrigida_a_mao_e_tentativa_em_andamento_nao_e_corrigida(): void
    {
        $emAndamento = (int) $this->iniciarTentativa($this->avaliacao)->json('id');
        $this->assertErroDeNegocio($this->corrigir($emAndamento, $this->dissertativa1, ['pontos' => 1]), 'ainda está em andamento');

        $this->responder($emAndamento, $this->dissertativa1, ['texto' => 'x'])->assertOk();
        $this->enviarTentativa($emAndamento)->assertOk();
        $this->assertErroDeNegocio($this->corrigir($emAndamento, $this->objetiva, ['pontos' => 1]), 'corrigidas automaticamente');
    }

    public function test_questao_fora_da_tentativa_e_recusada(): void
    {
        $id = $this->tentativaEnviada();
        $estranha = $this->criarDissertativa('Fora da prova');

        $this->assertErroDeNegocio($this->corrigir($id, $estranha, ['pontos' => 1]), 'não faz parte da tentativa');
    }

    public function test_depois_do_encerramento_da_turma_a_correcao_e_imutavel(): void
    {
        $id = $this->tentativaEnviada();
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 2])->assertOk();

        $this->noTenant($this->tenant, fn () => Turma::query()->whereKey($this->turma->id)->update(['status' => 'encerrada']));

        $this->assertErroDeNegocio($this->corrigir($id, $this->dissertativa1, ['pontos' => 1]), 'turma foi encerrada');
        $this->assertErroDeNegocio($this->corrigir($id, $this->dissertativa2, ['pontos' => 1]), 'turma foi encerrada');
    }

    public function test_comentario_e_opcional_e_vazio_vira_nulo(): void
    {
        $id = $this->tentativaEnviada();

        $this->corrigir($id, $this->dissertativa1, ['pontos' => 1, 'comentario' => '   '])->assertOk()->assertJsonPath('questoes.1.correcao.comentario', null);
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 1, 'comentario' => 'Ok'])->assertOk()->assertJsonPath('questoes.1.correcao.comentario', 'Ok');
    }

    public function test_fila_por_status_permite_rever_as_ja_corrigidas(): void
    {
        $id = $this->tentativaEnviada();
        $this->corrigir($id, $this->dissertativa1, ['pontos' => 2])->assertOk();
        $this->corrigir($id, $this->dissertativa2, ['pontos' => 3])->assertOk();

        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertOk()->assertJsonCount(0);
        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes?status=corrigida")->assertOk()->assertJsonCount(1)->assertJsonPath('0.nota', '10.00');
    }

    public function test_correcao_de_outro_tenant_responde_404(): void
    {
        $id = $this->tentativaEnviada();
        $tenantB = $this->criarTenant('prefeitura-b');
        $adminB = $this->usuario($tenantB, ['admin_cursos'], 'Admin B');

        $this->como($adminB, $tenantB)->getJson("/api/cursos/tentativas/{$id}/correcao")->assertNotFound();
        $this->como($adminB, $tenantB)->putJson("/api/cursos/tentativas/{$id}/respostas/{$this->dissertativa1->id}/correcao", ['pontos' => 1])->assertNotFound();
        $this->como($adminB, $tenantB)->getJson("/api/cursos/turmas/{$this->turma->id}/correcoes")->assertNotFound();
    }
}

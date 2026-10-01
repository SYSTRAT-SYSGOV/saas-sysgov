<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Notificacoes\Tratadores\InscricaoAprovadaTratador;
use Modules\Cursos\Notificacoes\Tratadores\InscricaoCanceladaTratador;
use Modules\Cursos\Notificacoes\Tratadores\InscricaoCriadaTratador;
use Modules\Cursos\Notificacoes\Tratadores\InscricaoPromovidaTratador;
use Modules\Cursos\Notificacoes\Tratadores\InscricaoRecusadaTratador;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 5.2 — tratadores de e-mail da inscrição (design D12): criada (texto por status),
 * aprovada, recusada, cancelada e promovida da lista de espera.
 */
final class InscricaoTratadoresTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private Curso $curso;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->curso = $this->cursoPublicado($this->tenant);
    }

    /** @param array<string, mixed> $atributos */
    private function turma(array $atributos = []): Turma
    {
        return $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, $atributos);
    }

    private function participante(string $nome): User
    {
        return $this->usuario($this->tenant, ['participante_cursos'], $nome);
    }

    private function eventoMaisRecente(string $tipo): OutboxEvent
    {
        return OutboxEvent::where('event_type', $tipo)->latest('id')->firstOrFail();
    }

    public function test_cenario_inscricao_em_lista_de_espera_envia_email_com_a_posicao(): void
    {
        $turma = $this->turma(['vagas' => 1]);
        $this->inscrever($this->tenant, $turma, $this->participante('Ana'));
        $bruno = $this->participante('Bruno');
        $inscricaoBruno = $this->inscrever($this->tenant, $turma, $bruno);
        $this->assertSame('lista_espera', $inscricaoBruno->fresh()->status);

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::where('destinatario', $bruno->email)->sole();
        $this->assertSame('enviado', $envio->situacao);
        $this->assertSame(InscricaoCriadaTratador::TIPO, $envio->tipo);

        $evento = OutboxEvent::where('event_type', 'cursos.InscricaoCriada')->where('payload->id', $inscricaoBruno->id)->sole();
        $mensagens = app(InscricaoCriadaTratador::class)->tratar($evento);
        $html = $mensagens[0]->mailable->render();
        $this->assertStringContainsString('lista de espera', $html);
        $this->assertStringContainsString('posição 1', $html);
    }

    public function test_inscricao_confirmada_e_pendente_tem_textos_diferentes(): void
    {
        $turmaConfirmada = $this->turma();
        $confirmada = $this->inscrever($this->tenant, $turmaConfirmada, $this->participante('Confirmada'));
        $evento1 = $this->eventoMaisRecenteDaInscricao($confirmada);
        $html1 = app(InscricaoCriadaTratador::class)->tratar($evento1)[0]->mailable->render();
        $this->assertStringContainsString('foi confirmada', $html1);

        $turmaPendente = $this->turma(['aprovacao_manual' => true]);
        $pendente = $this->inscrever($this->tenant, $turmaPendente, $this->participante('Pendente'));
        $evento2 = $this->eventoMaisRecenteDaInscricao($pendente);
        $html2 = app(InscricaoCriadaTratador::class)->tratar($evento2)[0]->mailable->render();
        $this->assertStringContainsString('aguardando aprovação', $html2);
    }

    private function eventoMaisRecenteDaInscricao(Inscricao $inscricao): OutboxEvent
    {
        return OutboxEvent::where('event_type', 'cursos.InscricaoCriada')->where('payload->id', $inscricao->id)->sole();
    }

    public function test_aprovacao_envia_email(): void
    {
        $turma = $this->turma(['aprovacao_manual' => true]);
        $participante = $this->participante('Ana');
        $inscricao = $this->inscrever($this->tenant, $turma, $participante);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/aprovar")->assertOk();

        $evento = $this->eventoMaisRecente('cursos.InscricaoAprovada');
        $mensagens = app(InscricaoAprovadaTratador::class)->tratar($evento);
        $this->assertCount(1, $mensagens);
        $this->assertSame($participante->email, $mensagens[0]->destinatario);
        $this->assertStringContainsString('foi aprovada', $mensagens[0]->mailable->render());
    }

    public function test_cenario_recusa_leva_o_motivo_no_email(): void
    {
        $turma = $this->turma(['aprovacao_manual' => true]);
        $participante = $this->participante('Ana');
        $inscricao = $this->inscrever($this->tenant, $turma, $participante);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/recusar", ['motivo' => 'Vagas destinadas a outra secretaria'])->assertOk();

        $evento = $this->eventoMaisRecente('cursos.InscricaoRecusada');
        $this->assertSame('Recusada: Vagas destinadas a outra secretaria', $evento->payload['motivo']);

        $html = app(InscricaoRecusadaTratador::class)->tratar($evento)[0]->mailable->render();
        $this->assertStringContainsString('foi recusada', $html);
        $this->assertStringContainsString('Vagas destinadas a outra secretaria', $html);
        // O prefixo "Recusada:" da coluna não deve vazar pro e-mail (repetiria "recusada" duas vezes).
        $this->assertStringNotContainsString('Recusada: Vagas', $html);
    }

    public function test_cancelamento_com_motivo_leva_o_motivo_no_email(): void
    {
        $turma = $this->turma();
        $participante = $this->participante('Ana');
        $inscricao = $this->inscrever($this->tenant, $turma, $participante);

        $this->como($participante, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/cancelar", ['motivo' => 'Mudei de horário'])->assertOk();

        $evento = $this->eventoMaisRecente('cursos.InscricaoCancelada');
        $html = app(InscricaoCanceladaTratador::class)->tratar($evento)[0]->mailable->render();
        $this->assertStringContainsString('foi cancelada', $html);
        $this->assertStringContainsString('Mudei de horário', $html);
    }

    public function test_cancelamento_sem_motivo_nao_mostra_linha_de_motivo(): void
    {
        $turma = $this->turma();
        $participante = $this->participante('Ana');
        $inscricao = $this->inscrever($this->tenant, $turma, $participante);

        $this->como($participante, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/cancelar", [])->assertOk();

        $evento = $this->eventoMaisRecente('cursos.InscricaoCancelada');
        $this->assertNull($evento->payload['motivo']);

        $html = app(InscricaoCanceladaTratador::class)->tratar($evento)[0]->mailable->render();
        $this->assertStringNotContainsString('Motivo informado', $html);
    }

    public function test_cenario_promocao_da_lista_de_espera_envia_email(): void
    {
        $turma = $this->turma(['vagas' => 1]);
        $ana = $this->participante('Ana');
        $inscricaoAna = $this->inscrever($this->tenant, $turma, $ana);
        $bruno = $this->participante('Bruno');
        $inscricaoBruno = $this->inscrever($this->tenant, $turma, $bruno);
        $this->assertSame('lista_espera', $inscricaoBruno->fresh()->status);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricaoAna->id}/cancelar", [])->assertOk();
        $this->assertSame('confirmada', $inscricaoBruno->fresh()->status);

        $this->artisan('outbox:process')->assertSuccessful();

        $envio = NotificacaoEnvio::where('destinatario', $bruno->email)->where('tipo', InscricaoPromovidaTratador::TIPO)->sole();
        $this->assertSame('enviado', $envio->situacao);

        $evento = $this->eventoMaisRecente('cursos.InscricaoPromovida');
        $html = app(InscricaoPromovidaTratador::class)->tratar($evento)[0]->mailable->render();
        $this->assertStringContainsString('saiu da lista de espera', $html);
        $this->assertStringContainsString('confirmada', $html);
    }

    public function test_promocao_para_pendente_quando_turma_tem_aprovacao_manual(): void
    {
        $turma = $this->turma(['vagas' => 1, 'aprovacao_manual' => true]);
        $ana = $this->participante('Ana');
        $inscricaoAna = $this->inscrever($this->tenant, $turma, $ana);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricaoAna->id}/aprovar")->assertOk();
        $bruno = $this->participante('Bruno');
        $this->inscrever($this->tenant, $turma, $bruno);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricaoAna->id}/cancelar", [])->assertOk();

        $evento = $this->eventoMaisRecente('cursos.InscricaoPromovida');
        $this->assertSame('pendente', $evento->payload['status']);
        $html = app(InscricaoPromovidaTratador::class)->tratar($evento)[0]->mailable->render();
        $this->assertStringContainsString('aguardando aprovação', $html);
    }
}

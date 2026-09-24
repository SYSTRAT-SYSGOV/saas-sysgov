<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Grupo 4 — inscrição, vagas, lista de espera, cancelamento e exportação.
 */
final class InscricaoTest extends TestCase
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

    private function participante(string $nome = 'Participante'): User
    {
        return $this->usuario($this->tenant, ['participante_cursos'], $nome);
    }

    /** @param array<string, mixed> $atributos */
    private function turma(array $atributos = []): Turma
    {
        return $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, $atributos);
    }

    private function statusDe(Inscricao|int $inscricao): string
    {
        $id = $inscricao instanceof Inscricao ? $inscricao->id : $inscricao;

        return $this->noTenant($this->tenant, fn () => Inscricao::findOrFail($id)->status);
    }

    // -------------------------------------------------------------- 4.1

    public function test_participante_e_criado_na_primeira_inscricao_e_reutilizado_depois(): void
    {
        $user = $this->participante();
        $this->como($user, $this->tenant)->postJson('/api/cursos/turmas/' . $this->turma()->id . '/inscricoes')->assertCreated();
        $this->como($user, $this->tenant)->postJson('/api/cursos/turmas/' . $this->turma(['nome' => 'Turma 2'])->id . '/inscricoes')->assertCreated();

        $this->noTenant($this->tenant, function () use ($user): void {
            $this->assertSame(1, Participante::where('user_id', $user->id)->count());
            $this->assertSame(2, Inscricao::count());
        });
    }

    // -------------------------------------------------------------- 4.2

    public function test_cenario_inscricao_com_vaga_e_sem_aprovacao_manual(): void
    {
        $this->como($this->participante(), $this->tenant)->postJson('/api/cursos/turmas/' . $this->turma()->id . '/inscricoes')
            ->assertCreated()->assertJsonPath('status', 'confirmada');

        $this->assertTrue(AuditLog::where('action', 'inscricao.criada')->whereNotNull('user_id')->exists());
        $this->assertTrue(OutboxEvent::where('event_type', 'cursos.InscricaoCriada')->exists());
    }

    public function test_turma_com_aprovacao_manual_gera_inscricao_pendente(): void
    {
        $this->como($this->participante(), $this->tenant)->postJson('/api/cursos/turmas/' . $this->turma(['aprovacao_manual' => true])->id . '/inscricoes')
            ->assertCreated()->assertJsonPath('status', 'pendente');
    }

    public function test_cenario_inscricao_duplicada(): void
    {
        $user = $this->participante();
        $turma = $this->turma();
        $this->como($user, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes")->assertCreated();

        $this->assertErroDeNegocio(
            $this->como($user, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes"),
            'já tem uma inscrição ativa',
        );
    }

    public function test_pode_se_inscrever_de_novo_depois_de_cancelar(): void
    {
        $user = $this->participante();
        $turma = $this->turma();
        $inscricao = $this->inscrever($this->tenant, $turma, $user);
        $this->como($user, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/cancelar")->assertOk();

        $this->como($user, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes")->assertCreated();
    }

    public function test_cenario_inscricao_fora_do_periodo(): void
    {
        $turma = $this->turma([
            'inscricoes_inicio' => now()->subDays(10)->toDateTimeString(),
            'inscricoes_fim' => now()->subDay()->toDateTimeString(),
        ]);

        $this->assertErroDeNegocio(
            $this->como($this->participante(), $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes"),
            'Fora do período de inscrição',
        );
    }

    public function test_curso_nao_publicado_nao_aceita_inscricao(): void
    {
        $turma = $this->turma();
        $this->noTenant($this->tenant, fn () => app(\Modules\Cursos\Services\CursoService::class)->alterarStatus($this->curso, \Modules\Cursos\Enums\StatusCurso::Encerrado));

        $this->assertErroDeNegocio(
            $this->como($this->participante(), $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes"),
            'cursos publicados',
        );
    }

    public function test_turma_lotada_coloca_na_lista_de_espera_com_posicao(): void
    {
        $turma = $this->turma(['vagas' => 1]);
        $this->inscrever($this->tenant, $turma, $this->participante('P1'));

        $segundo = $this->participante('P2');
        $terceiro = $this->participante('P3');
        $this->como($segundo, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes")->assertCreated()->assertJsonPath('status', 'lista_espera');
        $this->como($terceiro, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes")->assertCreated()->assertJsonPath('status', 'lista_espera');

        $minhas = $this->como($terceiro, $this->tenant)->getJson('/api/cursos/minhas-inscricoes')->assertOk();
        $this->assertSame(2, $minhas->json('0.posicao_fila'));

        $catalogo = $this->como($terceiro, $this->tenant)->getJson('/api/cursos/catalogo')->assertOk();
        $this->assertSame(0, $catalogo->json('0.turmas.0.vagas_restantes'));
        $this->assertSame('lista_espera', $catalogo->json('0.turmas.0.minha_inscricao.status'));
    }

    public function test_administrador_inscreve_diretamente_fora_do_periodo_e_sem_aprovacao(): void
    {
        $user = $this->participante();
        $turma = $this->turma([
            'aprovacao_manual' => true,
            'inscricoes_inicio' => now()->subDays(10)->toDateTimeString(),
            'inscricoes_fim' => now()->subDay()->toDateTimeString(),
        ]);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes/direta", ['user_id' => $user->id])
            ->assertCreated()->assertJsonPath('status', 'confirmada')->assertJsonPath('aprovada_por', $this->admin->id);
    }

    public function test_inscricao_direta_de_usuario_de_outro_tenant_e_recusada(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $alheio = $this->usuario($outro, ['participante_cursos']);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson('/api/cursos/turmas/' . $this->turma()->id . '/inscricoes/direta', ['user_id' => $alheio->id]),
            'não encontrado neste órgão',
        );
    }

    public function test_participante_nao_inscreve_outra_pessoa(): void
    {
        $this->como($this->participante(), $this->tenant)->postJson('/api/cursos/turmas/' . $this->turma()->id . '/inscricoes/direta', ['user_id' => $this->admin->id])
            ->assertForbidden();
    }

    // -------------------------------------------------------------- 4.3

    public function test_aprovar_e_recusar_pendentes(): void
    {
        $turma = $this->turma(['aprovacao_manual' => true]);
        $a = $this->inscrever($this->tenant, $turma, $this->participante('A'));
        $b = $this->inscrever($this->tenant, $turma, $this->participante('B'));

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$a->id}/aprovar")->assertOk()->assertJsonPath('status', 'confirmada');
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$b->id}/recusar", ['motivo' => 'Público-alvo é outra secretaria'])
            ->assertOk()->assertJsonPath('status', 'cancelada');

        $this->como($this->instrutor, $this->tenant)->postJson("/api/cursos/inscricoes/{$a->id}/aprovar")->assertForbidden();
    }

    public function test_cenario_cancelamento_libera_vaga_para_a_fila(): void
    {
        $turma = $this->turma(['vagas' => 1]);
        $confirmado = $this->participante('Confirmado');
        $inscricaoConfirmada = $this->inscrever($this->tenant, $turma, $confirmado);
        $primeiro = $this->inscrever($this->tenant, $turma, $this->participante('Primeiro da fila'));
        $segundo = $this->inscrever($this->tenant, $turma, $this->participante('Segundo da fila'));

        $this->como($confirmado, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricaoConfirmada->id}/cancelar")->assertOk();

        $this->assertSame('confirmada', $this->statusDe($primeiro));
        $this->assertSame('lista_espera', $this->statusDe($segundo));
        $this->assertTrue(OutboxEvent::where('event_type', 'cursos.InscricaoPromovida')->exists());

        $posicao = $this->como($this->admin, $this->tenant)->getJson("/api/cursos/inscricoes/{$segundo->id}")->json('posicao_fila');
        $this->assertSame(1, $posicao);
    }

    public function test_promocao_em_turma_com_aprovacao_manual_vira_pendente(): void
    {
        $turma = $this->turma(['vagas' => 1, 'aprovacao_manual' => true]);
        $pendente = $this->inscrever($this->tenant, $turma, $this->participante('A'));
        $fila = $this->inscrever($this->tenant, $turma, $this->participante('B'));

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$pendente->id}/recusar", ['motivo' => 'Não atende ao requisito'])->assertOk();

        $this->assertSame('pendente', $this->statusDe($fila));
    }

    public function test_aumentar_vagas_promove_a_fila(): void
    {
        $turma = $this->turma(['vagas' => 1]);
        $this->inscrever($this->tenant, $turma, $this->participante('A'));
        $b = $this->inscrever($this->tenant, $turma, $this->participante('B'));
        $c = $this->inscrever($this->tenant, $turma, $this->participante('C'));

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/turmas/{$turma->id}", ['vagas' => 2])->assertOk();

        $this->assertSame('confirmada', $this->statusDe($b));
        $this->assertSame('lista_espera', $this->statusDe($c));
    }

    public function test_vagas_nao_ficam_abaixo_das_ocupadas(): void
    {
        $turma = $this->turma(['vagas' => 3]);
        $this->inscrever($this->tenant, $turma, $this->participante('A'));
        $this->inscrever($this->tenant, $turma, $this->participante('B'));

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->putJson("/api/cursos/turmas/{$turma->id}", ['vagas' => 1]),
            'vagas ocupadas',
        );
    }

    public function test_cenario_participante_cancela_apos_o_inicio(): void
    {
        $user = $this->participante();
        $turma = $this->turma();
        $inscricao = $this->inscrever($this->tenant, $turma, $user);
        $this->agendamento($this->tenant, $turma, $this->aula($this->tenant, $this->curso), now()->subHour());

        $this->assertErroDeNegocio(
            $this->como($user, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/cancelar"),
            'procure o Administrador',
        );

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/cancelar", ['motivo' => 'Remanejado'])
            ->assertOk()->assertJsonPath('status', 'cancelada');
    }

    public function test_inscricao_cancelada_nao_volta(): void
    {
        $inscricao = $this->inscrever($this->tenant, $this->turma(), $this->participante());
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/cancelar")->assertOk();

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/inscricoes/{$inscricao->id}/cancelar"),
            'Transição inválida',
        );
    }

    // -------------------------------------------------------------- 4.5

    public function test_exportacao_csv_dos_inscritos_e_auditada(): void
    {
        $turma = $this->turma(['vagas' => 1]);
        $this->inscrever($this->tenant, $turma, $this->participante('Ana Souza'));
        $this->inscrever($this->tenant, $turma, $this->participante('Bruno Lima'));

        $resposta = $this->como($this->instrutor, $this->tenant)->get("/api/cursos/turmas/{$turma->id}/inscricoes/exportar")->assertOk();
        $csv = $resposta->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);
        $linhas = array_values(array_filter(explode("\n", trim(substr($csv, 3)))));
        $this->assertSame('Nome;E-mail;Status;"Data da inscrição";"Frequência até o momento (%)"', $linhas[0]);
        $this->assertCount(3, $linhas);
        $this->assertStringContainsString('Ana Souza', $linhas[1]);
        $this->assertStringContainsString('Confirmada', $linhas[1]);
        $this->assertStringContainsString('Lista de espera', $linhas[2]);
        $this->assertStringEndsWith(';0,00', $linhas[1]);

        $this->assertTrue(AuditLog::where('action', 'inscricoes.exportadas')->where('resource', "Turma #{$turma->id}")->where('user_id', $this->instrutor->id)->exists());
    }
}

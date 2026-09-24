<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Presenca;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Grupo 5 — chamada manual e check-in por QR code.
 */
final class PresencaTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $instrutor;

    private User $aluno;

    private Curso $curso;

    private Turma $turma;

    private Aula $aula;

    private Inscricao $inscricao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');
        $this->curso = $this->cursoPublicado($this->tenant);
        $this->turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['data_inicio' => now()->subDays(5)->toDateString()]);
        $this->aula = $this->aula($this->tenant, $this->curso);
        $this->inscricao = $this->inscrever($this->tenant, $this->turma, $this->aluno);
    }

    /** Aula acontecendo agora (começou há 30 min, termina em 90 min). */
    private function aulaEmAndamento(): AulaAgendamento
    {
        return $this->agendamento($this->tenant, $this->turma, $this->aula, now()->subMinutes(30), now()->addMinutes(90));
    }

    /**
     * @param array<int, bool> $mapa
     * @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function chamada(User $quem, AulaAgendamento $agendamento, array $mapa): \Illuminate\Testing\TestResponse
    {
        $presencas = [];
        foreach ($mapa as $id => $presente) {
            $presencas[] = ['inscricao_id' => $id, 'presente' => $presente];
        }

        return $this->como($quem, $this->tenant)->putJson("/api/cursos/agendamentos/{$agendamento->id}/chamada", ['presencas' => $presencas]);
    }

    private function presencas(): int
    {
        return $this->noTenant($this->tenant, fn () => Presenca::count());
    }

    // -------------------------------------------------------- 5.1 chamada manual

    public function test_cenario_chamada_antes_da_aula(): void
    {
        $futura = $this->agendamento($this->tenant, $this->turma, $this->aula, now()->addDay());

        $this->assertErroDeNegocio($this->chamada($this->instrutor, $futura, [$this->inscricao->id => true]), 'ainda não começou');
        $this->assertSame(0, $this->presencas());
    }

    public function test_cenario_correcao_de_presenca_com_auditoria(): void
    {
        $agendamento = $this->aulaEmAndamento();

        $this->chamada($this->instrutor, $agendamento, [$this->inscricao->id => false])->assertOk()
            ->assertJsonPath('chamada.0.presente', false);
        $this->chamada($this->instrutor, $agendamento, [$this->inscricao->id => true])->assertOk()
            ->assertJsonPath('chamada.0.presente', true)->assertJsonPath('chamada.0.origem', 'manual');

        $correcao = AuditLog::where('action', 'presenca.corrigida')->firstOrFail();
        $this->assertFalse($correcao->before['presente']);
        $this->assertTrue($correcao->after['presente']);
        $this->assertSame($this->instrutor->id, $correcao->user_id);
    }

    public function test_cenario_instrutor_tenta_registrar_presenca_em_turma_alheia(): void
    {
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Outro Instrutor');

        $this->chamada($outroInstrutor, $this->aulaEmAndamento(), [$this->inscricao->id => true])->assertForbidden();
        $this->assertSame(0, $this->presencas());
    }

    public function test_inscricao_da_lista_de_espera_nao_entra_na_chamada(): void
    {
        $this->como($this->usuario($this->tenant, ['admin_cursos'], 'Admin 2'), $this->tenant)
            ->putJson("/api/cursos/turmas/{$this->turma->id}", ['vagas' => 1])->assertOk();
        $naFila = $this->inscrever($this->tenant, $this->turma, $this->usuario($this->tenant, ['participante_cursos'], 'Na fila'));
        $this->assertSame('lista_espera', $naFila->status);

        $this->assertErroDeNegocio($this->chamada($this->instrutor, $this->aulaEmAndamento(), [$naFila->id => true]), 'Só inscrições confirmadas');
    }

    // ------------------------------------------------------------ 5.2 token do QR

    public function test_token_so_e_emitido_durante_a_aula_e_pelo_instrutor_designado(): void
    {
        $futura = $this->agendamento($this->tenant, $this->turma, $this->aula, now()->addDay());
        $this->assertErroDeNegocio($this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/agendamentos/{$futura->id}/qr-token"), 'durante a aula');

        $agora = $this->noTenant($this->tenant, fn () => tap($futura)->update(['inicio' => now()->subMinutes(5), 'fim' => now()->addHour()]));
        $qr = $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/agendamentos/{$agora->id}/qr-token")
            ->assertOk()->assertJsonPath('validade_segundos', 60);
        $this->assertStringStartsWith('data:image/svg+xml;base64,', (string) $qr->json('qr_code'));
        $this->assertSame('http://localhost:5174/cursos/check-in?t=' . $qr->json('token'), $qr->json('url'));

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/agendamentos/{$agora->id}/qr-token")->assertForbidden();
    }

    private function token(AulaAgendamento $agendamento): string
    {
        return (string) $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/agendamentos/{$agendamento->id}/qr-token")->assertOk()->json('token');
    }

    public function test_token_adulterado_para_outro_agendamento_e_recusado(): void
    {
        $a = $this->aulaEmAndamento();
        $outraAula = $this->aula($this->tenant, $this->curso, 'Aula 2');
        $b = $this->agendamento($this->tenant, $this->turma, $outraAula, now()->subMinutes(10), now()->addHour());

        [, $assinatura] = explode('.', $this->token($a));
        [$cargaA] = explode('.', $this->token($a));
        $cargaAdulterada = rtrim(strtr(base64_encode(str_replace((string) $a->id, (string) $b->id, (string) base64_decode(strtr($cargaA, '-_', '+/')))), '+/', '-_'), '=');

        $this->assertErroDeNegocio(
            $this->como($this->aluno, $this->tenant)->postJson('/api/cursos/check-in', ['token' => $cargaAdulterada . '.' . $assinatura]),
            'QR code inválido',
        );
    }

    // ------------------------------------------------------------- 5.3 check-in

    public function test_cenario_check_in_valido(): void
    {
        $token = $this->token($this->aulaEmAndamento());

        $this->como($this->aluno, $this->tenant)->postJson('/api/cursos/check-in', ['token' => $token])
            ->assertCreated()->assertJsonPath('ja_registrada', false)->assertJsonPath('presenca.origem', 'qr_code');

        $this->assertTrue($this->noTenant($this->tenant, fn () => Presenca::where('inscricao_id', $this->inscricao->id)->where('presente', true)->exists()));
    }

    public function test_cenario_qr_expirado(): void
    {
        $token = $this->token($this->aulaEmAndamento());
        $this->travel(61)->seconds();

        $this->assertErroDeNegocio($this->como($this->aluno, $this->tenant)->postJson('/api/cursos/check-in', ['token' => $token]), 'expirou');
        $this->assertSame(0, $this->presencas());
    }

    public function test_cenario_check_in_repetido(): void
    {
        $token = $this->token($this->aulaEmAndamento());

        $this->como($this->aluno, $this->tenant)->postJson('/api/cursos/check-in', ['token' => $token])->assertCreated();
        $this->como($this->aluno, $this->tenant)->postJson('/api/cursos/check-in', ['token' => $token])->assertOk()->assertJsonPath('ja_registrada', true);

        $this->assertSame(1, $this->presencas());
    }

    public function test_check_in_sem_inscricao_confirmada_e_recusado(): void
    {
        $semInscricao = $this->usuario($this->tenant, ['participante_cursos'], 'Sem inscrição');
        $token = $this->token($this->aulaEmAndamento());

        $this->assertErroDeNegocio(
            $this->como($semInscricao, $this->tenant)->postJson('/api/cursos/check-in', ['token' => $token]),
            'inscrição confirmada',
        );
    }

    public function test_check_in_depois_do_fim_da_aula_e_recusado(): void
    {
        $agendamento = $this->agendamento($this->tenant, $this->turma, $this->aula, now()->subMinutes(59), now()->addSeconds(30));
        $token = $this->token($agendamento);
        $this->travel(45)->seconds();

        $this->assertErroDeNegocio($this->como($this->aluno, $this->tenant)->postJson('/api/cursos/check-in', ['token' => $token]), 'não está disponível agora');
    }

    public function test_token_de_outro_tenant_nao_encontra_a_aula(): void
    {
        $token = $this->token($this->aulaEmAndamento());
        $outro = $this->criarTenant('prefeitura-b');
        $alunoB = $this->usuario($outro, ['participante_cursos']);

        $this->assertErroDeNegocio($this->como($alunoB, $outro)->postJson('/api/cursos/check-in', ['token' => $token]), 'QR code inválido');
    }
}

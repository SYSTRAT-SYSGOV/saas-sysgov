<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Grupo 3 — cursos, eventos, formações, turmas, aulas e policies de objeto.
 * Os nomes dos testes citam os cenários da spec (specs/cursos/spec.md).
 */
final class CatalogoCursosTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private User $participante;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin Cursos');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor Um');
        $this->participante = $this->usuario($this->tenant, ['participante_cursos'], 'Participante Um');
    }

    // ---------------------------------------------------------------- 3.1 curso

    public function test_curso_nasce_em_rascunho_com_auditoria_e_outbox(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', [
            'titulo' => 'Lei 14.133 na prática', 'carga_horaria_minutos' => 600,
        ])->assertCreated()->assertJsonPath('status', 'rascunho')->assertJsonPath('frequencia_minima', 75);

        $id = $resposta->json('id');
        $this->assertTrue(AuditLog::where('action', 'curso.criado')->where('resource', "Curso #{$id}")->whereNotNull('user_id')->exists());
        $this->assertTrue(OutboxEvent::where('event_type', 'cursos.CursoCriado')->exists());
    }

    public function test_cenario_curso_em_rascunho_nao_aparece_no_catalogo(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', ['titulo' => 'Rascunho', 'carga_horaria_minutos' => 60])->assertCreated();
        $publicado = $this->cursoPublicado($this->tenant, ['titulo' => 'Publicado']);

        $catalogo = $this->como($this->participante, $this->tenant)->getJson('/api/cursos/catalogo')->assertOk();

        $this->assertSame([$publicado->id], array_column($catalogo->json(), 'id'));
    }

    public function test_cenario_transicao_invalida_e_recusada(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$curso->id}/status", ['status' => 'encerrado'])->assertOk();

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$curso->id}/status", ['status' => 'publicado']),
            'Transição inválida',
        );
    }

    public function test_cenario_exclusao_de_curso_com_inscricoes(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $turma = $this->turmaAberta($this->tenant, $curso, $this->instrutor);
        $this->inscrever($this->tenant, $turma, $this->participante);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/cursos/{$curso->id}"),
            'Encerre o curso',
        );
        $this->assertTrue($this->noTenant($this->tenant, fn () => Curso::whereKey($curso->id)->exists()));
    }

    public function test_curso_sem_inscricoes_pode_ser_excluido(): void
    {
        $curso = $this->cursoPublicado($this->tenant);

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/cursos/{$curso->id}")->assertOk();
    }

    public function test_upload_de_capa_no_disco_publico_do_tenant(): void
    {
        Storage::fake('public');
        $curso = $this->cursoPublicado($this->tenant);

        $resposta = $this->como($this->admin, $this->tenant)->post("/api/cursos/cursos/{$curso->id}/capa", [
            'capa' => UploadedFile::fake()->image('capa.png', 800, 450),
        ], ['Accept' => 'application/json'])->assertOk();

        $caminho = (string) $resposta->json('capa_path');
        $this->assertStringStartsWith("cursos/{$this->tenant->id}/capas/", $caminho);
        Storage::disk('public')->assertExists($caminho);
        $this->assertNotNull($resposta->json('capa_url'));
    }

    public function test_participante_nao_cria_curso(): void
    {
        $this->como($this->participante, $this->tenant)->postJson('/api/cursos/cursos', ['titulo' => 'X', 'carga_horaria_minutos' => 60])->assertForbidden();
    }

    // ------------------------------------------------------------ 3.2 formação

    public function test_formacao_com_composicao_ordenada(): void
    {
        $a = $this->cursoPublicado($this->tenant, ['titulo' => 'A']);
        $b = $this->cursoPublicado($this->tenant, ['titulo' => 'B']);

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/formacoes', [
            'titulo' => 'Trilha de Compras Públicas',
            'cursos' => [
                ['curso_id' => $b->id, 'obrigatorio' => false, 'ordem' => 2],
                ['curso_id' => $a->id, 'obrigatorio' => true, 'ordem' => 1],
            ],
        ])->assertCreated()
            ->assertJsonPath('cursos.0.id', $a->id)
            ->assertJsonPath('cursos.0.pivot.obrigatorio', true)
            ->assertJsonPath('cursos.1.id', $b->id);
    }

    public function test_formacao_exige_um_curso_obrigatorio(): void
    {
        $a = $this->cursoPublicado($this->tenant);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson('/api/cursos/formacoes', [
                'titulo' => 'Trilha', 'cursos' => [['curso_id' => $a->id, 'obrigatorio' => false]],
            ]),
            'ao menos um curso obrigatório',
        );
    }

    public function test_formacao_nao_aceita_curso_de_outro_tenant(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $this->usuario($outro, ['admin_cursos']);
        $cursoAlheio = $this->cursoPublicado($outro);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson('/api/cursos/formacoes', [
                'titulo' => 'Trilha', 'cursos' => [['curso_id' => $cursoAlheio->id, 'obrigatorio' => true]],
            ]),
            'só pode conter cursos deste órgão',
        );
    }

    // --------------------------------------------------------------- 3.3 turma

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function dadosTurma(array $extra = []): array
    {
        return [
            'nome' => 'Turma A', 'data_inicio' => now()->addDays(10)->toDateString(), 'data_fim' => now()->addDays(20)->toDateString(),
            'inscricoes_inicio' => now()->toDateTimeString(), 'inscricoes_fim' => now()->addDays(5)->toDateTimeString(),
            'vagas' => 30, 'modalidade' => 'presencial', 'local' => 'Sala 1', 'instrutores' => [$this->instrutor->id], ...$extra,
        ];
    }

    public function test_cenario_turma_online_sem_link(): void
    {
        $curso = $this->cursoPublicado($this->tenant);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$curso->id}/turmas", $this->dadosTurma(['modalidade' => 'online', 'local' => null])),
            'link é obrigatório',
        );
    }

    public function test_turma_hibrida_exige_local_e_link(): void
    {
        $curso = $this->cursoPublicado($this->tenant);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$curso->id}/turmas", $this->dadosTurma(['modalidade' => 'hibrido', 'link' => 'https://meet.example/x', 'local' => null])),
            'local é obrigatório',
        );
    }

    public function test_cenario_instrutor_de_outro_tenant(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $outro = $this->criarTenant('prefeitura-b');
        $instrutorAlheio = $this->usuario($outro, ['instrutor_cursos']);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$curso->id}/turmas", $this->dadosTurma(['instrutores' => [$instrutorAlheio->id]])),
            'usuários ativos deste órgão',
        );
    }

    public function test_instrutor_inativo_e_recusado(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $this->instrutor->update(['is_active' => false]);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$curso->id}/turmas", $this->dadosTurma()),
            'usuários ativos deste órgão',
        );
    }

    public function test_cenario_segunda_turma_para_evento(): void
    {
        $evento = $this->cursoPublicado($this->tenant, ['tipo' => 'evento', 'titulo' => 'Palestra LGPD']);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$evento->id}/turmas", $this->dadosTurma())->assertCreated();

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$evento->id}/turmas", $this->dadosTurma(['nome' => 'Turma B'])),
            'Eventos têm turma única',
        );
    }

    public function test_evento_com_turma_cancelada_pode_ser_remarcado(): void
    {
        $evento = $this->cursoPublicado($this->tenant, ['tipo' => 'evento']);
        $turma = $this->turmaAberta($this->tenant, $evento, $this->instrutor);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/cancelar", ['motivo' => 'Palestrante indisponível'])->assertOk();

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$evento->id}/turmas", $this->dadosTurma())->assertCreated();
    }

    public function test_cancelar_turma_cancela_as_inscricoes_ativas(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->cursoPublicado($this->tenant), $this->instrutor);
        $inscricao = $this->inscrever($this->tenant, $turma, $this->participante);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/cancelar", ['motivo' => 'Sem quórum'])->assertOk()->assertJsonPath('status', 'cancelada');

        $this->assertSame('cancelada', $this->noTenant($this->tenant, fn () => $inscricao->refresh()->status));
    }

    // ---------------------------------------------------------- 3.4 agendamento

    public function test_cenario_agendamento_fora_do_periodo_da_turma(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $turma = $this->turmaAberta($this->tenant, $curso, $this->instrutor);
        $aula = $this->aula($this->tenant, $curso);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/agendamentos", [
                'aula_id' => $aula->id, 'inicio' => now()->addDays(41)->setTime(9, 0)->toDateTimeString(), 'fim' => now()->addDays(41)->setTime(11, 0)->toDateTimeString(),
            ]),
            'dentro do período da turma',
        );
    }

    public function test_instrutor_designado_agenda_aula_da_propria_turma(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $turma = $this->turmaAberta($this->tenant, $curso, $this->instrutor);
        $aula = $this->aula($this->tenant, $curso);

        $this->como($this->instrutor, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/agendamentos", [
            'aula_id' => $aula->id, 'inicio' => now()->addDays(12)->setTime(9, 0)->toDateTimeString(), 'fim' => now()->addDays(12)->setTime(11, 0)->toDateTimeString(),
        ])->assertCreated();
    }

    public function test_aula_de_outro_curso_nao_e_agendada(): void
    {
        $turma = $this->turmaAberta($this->tenant, $this->cursoPublicado($this->tenant), $this->instrutor);
        $aulaDeOutroCurso = $this->aula($this->tenant, $this->cursoPublicado($this->tenant, ['titulo' => 'Outro']));

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/agendamentos", [
                'aula_id' => $aulaDeOutroCurso->id, 'inicio' => now()->addDays(12)->toDateTimeString(), 'fim' => now()->addDays(12)->addHour()->toDateTimeString(),
            ]),
            'não pertence ao curso',
        );
    }

    // ------------------------------------------------------ 3.5 policies de objeto

    public function test_instrutor_nao_opera_turma_alheia(): void
    {
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor Dois');
        $curso = $this->cursoPublicado($this->tenant);
        $turmaAlheia = $this->turmaAberta($this->tenant, $curso, $outroInstrutor);
        $aula = $this->aula($this->tenant, $curso);

        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/turmas/{$turmaAlheia->id}/inscricoes")->assertForbidden();
        $this->como($this->instrutor, $this->tenant)->postJson("/api/cursos/turmas/{$turmaAlheia->id}/agendamentos", [
            'aula_id' => $aula->id, 'inicio' => now()->addDays(12)->toDateTimeString(), 'fim' => now()->addDays(12)->addHour()->toDateTimeString(),
        ])->assertForbidden();
    }

    public function test_instrutor_ve_curso_em_rascunho_da_propria_turma(): void
    {
        $curso = $this->noTenant($this->tenant, fn () => app(\Modules\Cursos\Services\CursoService::class)->criar(['titulo' => 'Em preparo', 'carga_horaria_minutos' => 60], $this->admin));
        $this->turmaAberta($this->tenant, $curso, $this->instrutor);

        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/cursos/{$curso->id}")->assertOk();
        $this->como($this->participante, $this->tenant)->getJson("/api/cursos/cursos/{$curso->id}")->assertForbidden();
    }

    public function test_cenario_participante_tenta_ver_inscricao_de_outra_pessoa(): void
    {
        $outro = $this->usuario($this->tenant, ['participante_cursos'], 'Participante Dois');
        $turma = $this->turmaAberta($this->tenant, $this->cursoPublicado($this->tenant), $this->instrutor);
        $inscricaoAlheia = $this->inscrever($this->tenant, $turma, $outro);

        $this->como($this->participante, $this->tenant)->getJson("/api/cursos/inscricoes/{$inscricaoAlheia->id}")->assertForbidden();
        $this->como($outro, $this->tenant)->getJson("/api/cursos/inscricoes/{$inscricaoAlheia->id}")->assertOk();
    }

    public function test_cenario_curso_de_outro_tenant_nao_e_acessivel(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $this->usuario($outro, ['admin_cursos']);
        $cursoAlheio = $this->cursoPublicado($outro);

        $this->como($this->admin, $this->tenant)->getJson("/api/cursos/cursos/{$cursoAlheio->id}")->assertNotFound();
        $this->como($this->admin, $this->tenant)->getJson('/api/cursos/cursos')->assertOk()->assertJsonCount(0, 'data');
    }

    // ---------------------------------------------------- busca de usuários

    public function test_busca_de_usuarios_do_orgao_so_para_o_administrador(): void
    {
        $outro = $this->criarTenant('prefeitura-b');
        $this->usuario($outro, ['participante_cursos'], 'Instrutor Alheio');

        $nomes = array_column($this->como($this->admin, $this->tenant)->getJson('/api/cursos/usuarios?busca=Instrutor')->assertOk()->json(), 'name');
        $this->assertSame(['Instrutor Um'], $nomes);

        $this->como($this->participante, $this->tenant)->getJson('/api/cursos/usuarios')->assertForbidden();
    }
}

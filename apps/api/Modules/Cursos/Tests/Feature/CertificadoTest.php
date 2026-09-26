<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Models\AulaAgendamento;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\ApuracaoConclusaoService;
use Modules\Cursos\Services\CertificadoService;
use Modules\Cursos\Services\FormacaoService;
use Modules\Cursos\Services\PresencaService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Grupo 6 — apuração de conclusão, modelos, emissão, encerramento,
 * formação, PDF e revogação.
 */
final class CertificadoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
    }

    private function modeloPadrao(): ModeloCertificado
    {
        return $this->noTenant($this->tenant, fn () => ModeloCertificado::create([
            'nome' => 'Padrão', 'titulo' => 'Certificado',
            'corpo' => "Certificamos que {{participante}} concluiu {{curso}}, com carga horária de {{carga_horaria}}, no período de {{periodo}}.\n\n{{orgao}}, {{data_emissao}}.",
            'padrao' => true,
        ]));
    }

    /**
     * Turma com N aulas já realizadas (no passado) e os alunos inscritos.
     *
     * @param list<User> $alunos
     * @return array{turma: Turma, agendamentos: list<AulaAgendamento>, inscricoes: list<Inscricao>}
     */
    private function turmaRealizada(Curso $curso, array $alunos, int $aulas = 4): array
    {
        $turma = $this->turmaAberta($this->tenant, $curso, $this->instrutor, ['data_inicio' => now()->subDays(30)->toDateString(), 'vagas' => 50]);
        $inscricoes = array_map(fn (User $u) => $this->inscrever($this->tenant, $turma, $u), $alunos);
        $agendamentos = [];
        for ($i = 1; $i <= $aulas; $i++) {
            $agendamentos[] = $this->agendamento($this->tenant, $turma, $this->aula($this->tenant, $curso, "Aula {$i}"), now()->subDays(20 - $i), now()->subDays(20 - $i)->addHours(2));
        }

        return ['turma' => $turma, 'agendamentos' => $agendamentos, 'inscricoes' => $inscricoes];
    }

    /**
     * @param list<AulaAgendamento> $agendamentos
     */
    private function presencas(Inscricao $inscricao, array $agendamentos, int $presencas): void
    {
        $this->noTenant($this->tenant, function () use ($inscricao, $agendamentos, $presencas): void {
            foreach ($agendamentos as $i => $agendamento) {
                app(PresencaService::class)->registrarChamada($agendamento, [$inscricao->id => $i < $presencas], $this->instrutor);
            }
        });
    }

    /** @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response> */
    private function encerrar(Turma $turma): \Illuminate\Testing\TestResponse
    {
        return $this->como($this->instrutor, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/encerrar");
    }

    // ------------------------------------------------------------ 6.1 apuração

    public function test_cenarios_de_apuracao_pela_frequencia_minima(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['frequencia_minima' => 75]);
        $tresDeQuatro = $this->usuario($this->tenant, ['participante_cursos'], 'Tres de quatro');
        $doisDeQuatro = $this->usuario($this->tenant, ['participante_cursos'], 'Dois de quatro');
        ['agendamentos' => $ag, 'inscricoes' => [$a, $b]] = $this->turmaRealizada($curso, [$tresDeQuatro, $doisDeQuatro]);
        $this->presencas($a, $ag, 3);
        $this->presencas($b, $ag, 2);

        $this->noTenant($this->tenant, function () use ($a, $b): void {
            $apuracao = app(ApuracaoConclusaoService::class);
            $this->assertSame(['concluiu' => true, 'frequencia' => 75.0], $apuracao->apurar($a->refresh()));
            $this->assertSame(['concluiu' => false, 'frequencia' => 50.0], $apuracao->apurar($b->refresh()));
        });
    }

    public function test_turma_sem_aula_agendada_nao_divide_por_zero_nem_conclui(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['frequencia_minima' => 0]);
        $turma = $this->turmaAberta($this->tenant, $curso, $this->instrutor);
        $inscricao = $this->inscrever($this->tenant, $turma, $this->usuario($this->tenant));

        $this->assertSame(['concluiu' => false, 'frequencia' => 0.0], $this->noTenant($this->tenant, fn () => app(ApuracaoConclusaoService::class)->apurar($inscricao)));
        $this->assertErroDeNegocio($this->encerrar($turma), 'não tem aulas agendadas');
    }

    // ------------------------------------------------------------ 6.2 modelos

    public function test_cenario_campo_dinamico_invalido(): void
    {
        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
                'nome' => 'Modelo', 'titulo' => 'Certificado', 'corpo' => 'Certificamos que {{participante}} ({{cpf_completo}}) concluiu {{curso}}.',
            ]),
            '{{cpf_completo}}',
        );
    }

    public function test_modelo_remove_html_e_mantem_um_unico_padrao(): void
    {
        $primeiro = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'A', 'titulo' => 'Certificado', 'corpo' => '<script>alert(1)</script>Certificamos que {{participante}} concluiu.', 'padrao' => true,
        ])->assertCreated();
        $this->assertSame('alert(1)Certificamos que {{participante}} concluiu.', $primeiro->json('corpo'));

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', ['nome' => 'B', 'titulo' => 'Certificado', 'corpo' => 'Texto', 'padrao' => true])->assertCreated();

        $this->assertSame(['B'], $this->noTenant($this->tenant, fn () => ModeloCertificado::where('padrao', true)->pluck('nome')->all()));
    }

    public function test_modelo_aceita_ate_tres_assinaturas_com_imagem(): void
    {
        Storage::fake('public');
        $assinatura = ['nome' => 'Maria Prefeita', 'cargo' => 'Prefeita Municipal'];

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'A', 'titulo' => 'Certificado', 'corpo' => 'Texto', 'assinaturas' => [$assinatura, $assinatura, $assinatura, $assinatura],
        ])->assertUnprocessable();

        $modelo = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/modelos-certificado', [
            'nome' => 'A', 'titulo' => 'Certificado', 'corpo' => 'Texto', 'assinaturas' => [$assinatura],
        ])->assertCreated()->json('id');

        $caminho = $this->como($this->admin, $this->tenant)->post("/api/cursos/modelos-certificado/{$modelo}/assinaturas/0/imagem", [
            'imagem' => UploadedFile::fake()->image('assinatura.png', 400, 120),
        ], ['Accept' => 'application/json'])->assertOk()->json('assinaturas.0.imagem_path');

        Storage::disk('public')->assertExists($caminho);
        $this->assertStringStartsWith("cursos/{$this->tenant->id}/certificados/", $caminho);
    }

    // ------------------------------------------------- 6.3 emissão / 6.4 encerramento

    public function test_cenario_emissao_ao_concluir_com_codigo_unico_e_snapshot(): void
    {
        $this->modeloPadrao();
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Gestão de Contratos', 'carga_horaria_minutos' => 510]);
        $aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Ana Souza');
        ['turma' => $turma, 'agendamentos' => $ag, 'inscricoes' => [$inscricao]] = $this->turmaRealizada($curso, [$aluno]);
        $this->presencas($inscricao, $ag, 4);

        $this->encerrar($turma)->assertOk()->assertJsonPath('concluidas', 1)->assertJsonPath('certificados_emitidos', 1);

        $certificado = $this->noTenant($this->tenant, fn () => Certificado::firstOrFail());
        $this->assertMatchesRegularExpression('/^[0-9A-HJKMNP-TV-Z]{12}$/', $certificado->codigo);
        $this->assertSame('Ana Souza', $certificado->dados['participante']);
        $this->assertSame('8h30', $certificado->dados['carga_horaria']);
        $this->assertStringContainsString('Certificamos que Ana Souza concluiu Gestão de Contratos, com carga horária de 8h30', $certificado->dados['corpo']);
        $this->assertStringContainsString('Prefeitura A', $certificado->dados['corpo']);
        $this->assertTrue(OutboxEvent::where('event_type', 'cursos.CertificadoEmitido')->exists());

        $this->como($aluno, $this->tenant)->getJson('/api/cursos/meus-certificados')->assertOk()
            ->assertJsonPath('0.codigo', $certificado->codigoFormatado())
            ->assertJsonPath('0.curso', 'Gestão de Contratos');
    }

    public function test_cenario_alteracao_posterior_do_curso(): void
    {
        $this->modeloPadrao();
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Título original']);
        $aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');
        ['turma' => $turma, 'agendamentos' => $ag, 'inscricoes' => [$inscricao]] = $this->turmaRealizada($curso, [$aluno]);
        $this->presencas($inscricao, $ag, 4);
        $this->encerrar($turma)->assertOk();

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$curso->id}", ['titulo' => 'Título novo'])->assertOk();
        $aluno->update(['name' => 'Nome Trocado']);

        $dados = $this->noTenant($this->tenant, fn () => Certificado::firstOrFail()->dados);
        $this->assertSame('Título original', $dados['curso']);
        $this->assertSame('Aluno', $dados['participante']);
    }

    public function test_cenario_frequencia_insuficiente_sem_certificado(): void
    {
        $this->modeloPadrao();
        $curso = $this->cursoPublicado($this->tenant);
        ['turma' => $turma, 'agendamentos' => $ag, 'inscricoes' => [$inscricao]] = $this->turmaRealizada($curso, [$this->usuario($this->tenant)]);
        $this->presencas($inscricao, $ag, 2);

        $this->encerrar($turma)->assertOk()->assertJsonPath('nao_concluidas', 1)->assertJsonPath('certificados_emitidos', 0);

        $this->noTenant($this->tenant, function () use ($inscricao): void {
            $this->assertSame('nao_concluida', $inscricao->refresh()->status);
            $this->assertSame('50.00', $inscricao->frequencia_apurada);
            $this->assertSame(0, Certificado::count());
        });
    }

    public function test_sem_modelo_a_emissao_fica_pendente_ate_criar_um(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        ['turma' => $turma, 'agendamentos' => $ag, 'inscricoes' => [$inscricao]] = $this->turmaRealizada($curso, [$this->usuario($this->tenant, ['participante_cursos'], 'Pendente')]);
        $this->presencas($inscricao, $ag, 4);

        $this->encerrar($turma)->assertOk()
            ->assertJsonPath('certificados_emitidos', 0)
            ->assertJsonPath('certificados_pendentes.0.participante', 'Pendente');

        $this->modeloPadrao();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/certificados/emitir-pendentes")->assertOk()->assertJsonPath('emitidos', 1);
        $this->assertSame(1, $this->noTenant($this->tenant, fn () => Certificado::count()));
    }

    public function test_cenario_encerramento_antes_da_ultima_aula(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        ['turma' => $turma] = $this->turmaRealizada($curso, [$this->usuario($this->tenant)]);
        $this->agendamento($this->tenant, $turma, $this->aula($this->tenant, $curso, 'Aula futura'), now()->addDays(2));

        $this->assertErroDeNegocio($this->encerrar($turma), 'depois do fim da última aula');
    }

    public function test_encerramento_cancela_pendentes_e_fila_e_trava_presencas(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $aluno = $this->usuario($this->tenant);
        ['turma' => $turma, 'agendamentos' => $ag, 'inscricoes' => [$inscricao]] = $this->turmaRealizada($curso, [$aluno]);
        $this->noTenant($this->tenant, fn () => $turma->update(['vagas' => 1]));
        $naFila = $this->inscrever($this->tenant, $turma, $this->usuario($this->tenant), peloAdministrador: true);
        $this->assertSame('lista_espera', $naFila->status);

        $this->encerrar($turma)->assertOk()->assertJsonPath('canceladas', 1);

        $this->assertSame('cancelada', $this->noTenant($this->tenant, fn () => $naFila->refresh()->status));
        $this->assertErroDeNegocio(
            $this->como($this->instrutor, $this->tenant)->putJson("/api/cursos/agendamentos/{$ag[0]->id}/chamada", ['presencas' => [['inscricao_id' => $inscricao->id, 'presente' => true]]]),
            'não pode',
        );
    }

    public function test_instrutor_nao_encerra_turma_alheia(): void
    {
        $outro = $this->usuario($this->tenant, ['instrutor_cursos'], 'Outro');
        ['turma' => $turma] = $this->turmaRealizada($this->cursoPublicado($this->tenant), []);

        $this->como($outro, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/encerrar")->assertForbidden();
    }

    // ------------------------------------------------------------ 6.5 formação

    public function test_cenarios_conclusao_da_formacao_e_optativo_nao_exigido(): void
    {
        $this->modeloPadrao();
        $obrigatorio1 = $this->cursoPublicado($this->tenant, ['titulo' => 'Obrigatório 1', 'carga_horaria_minutos' => 600]);
        $obrigatorio2 = $this->cursoPublicado($this->tenant, ['titulo' => 'Obrigatório 2', 'carga_horaria_minutos' => 300]);
        $optativo = $this->cursoPublicado($this->tenant, ['titulo' => 'Optativo', 'carga_horaria_minutos' => 120]);
        $formacao = $this->noTenant($this->tenant, fn () => app(FormacaoService::class)->criar(['titulo' => 'Trilha de Contratações'], [
            ['curso_id' => $obrigatorio1->id, 'obrigatorio' => true],
            ['curso_id' => $obrigatorio2->id, 'obrigatorio' => true],
            ['curso_id' => $optativo->id, 'obrigatorio' => false],
        ]));
        $aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Concluinte');

        foreach ([$obrigatorio1, $obrigatorio2] as $n => $curso) {
            ['turma' => $turma, 'agendamentos' => $ag, 'inscricoes' => [$inscricao]] = $this->turmaRealizada($curso, [$aluno]);
            $this->presencas($inscricao, $ag, 4);
            $this->encerrar($turma)->assertOk();

            $certificadosDaFormacao = $this->noTenant($this->tenant, fn () => Certificado::where('formacao_id', $formacao->id)->count());
            $this->assertSame($n === 0 ? 0 : 1, $certificadosDaFormacao, $n === 0 ? 'Com um obrigatório pendente a formação não conclui.' : 'Ao concluir o último obrigatório a formação conclui.');
        }

        $certificado = $this->noTenant($this->tenant, fn () => Certificado::where('formacao_id', $formacao->id)->firstOrFail());
        $this->assertSame('formacao', $certificado->tipo);
        $this->assertSame('Trilha de Contratações', $certificado->dados['curso']);
        $this->assertSame(900, $certificado->dados['carga_horaria_minutos']);
    }

    // ------------------------------------------------------ 6.6 PDF e revogação

    private function certificadoEmitido(User $aluno): Certificado
    {
        $this->modeloPadrao();
        ['turma' => $turma, 'agendamentos' => $ag, 'inscricoes' => [$inscricao]] = $this->turmaRealizada($this->cursoPublicado($this->tenant), [$aluno]);
        $this->presencas($inscricao, $ag, 4);
        $this->encerrar($turma)->assertOk();

        return $this->noTenant($this->tenant, fn () => Certificado::firstOrFail());
    }

    public function test_pdf_e_gerado_para_o_proprio_participante_e_negado_a_terceiros(): void
    {
        $aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno PDF');
        $certificado = $this->certificadoEmitido($aluno);

        $pdf = $this->como($aluno, $this->tenant)->get("/api/cursos/certificados/{$certificado->id}/pdf")->assertOk();
        $this->assertSame('application/pdf', $pdf->headers->get('Content-Type'));
        $this->assertStringStartsWith('%PDF', (string) $pdf->getContent());

        $this->como($this->admin, $this->tenant)->get("/api/cursos/certificados/{$certificado->id}/pdf")->assertOk();
        $this->como($this->usuario($this->tenant, ['participante_cursos'], 'Curioso'), $this->tenant)
            ->getJson("/api/cursos/certificados/{$certificado->id}/pdf")->assertForbidden();
    }

    public function test_revogacao_bloqueia_o_download(): void
    {
        $aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');
        $certificado = $this->certificadoEmitido($aluno);

        $this->como($aluno, $this->tenant)->postJson("/api/cursos/certificados/{$certificado->id}/revogar", ['motivo' => 'x'])->assertForbidden();
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/certificados/{$certificado->id}/revogar", ['motivo' => 'Emitido por engano'])
            ->assertOk()->assertJsonPath('motivo_revogacao', 'Emitido por engano');

        $this->assertErroDeNegocio($this->como($aluno, $this->tenant)->getJson("/api/cursos/certificados/{$certificado->id}/pdf"), 'revogado');
    }

    public function test_formatacao_de_carga_horaria(): void
    {
        $this->assertSame('1 hora', CertificadoService::formatarCargaHoraria(60));
        $this->assertSame('8 horas', CertificadoService::formatarCargaHoraria(480));
        $this->assertSame('8h30', CertificadoService::formatarCargaHoraria(510));
        $this->assertSame('45 minutos', CertificadoService::formatarCargaHoraria(45));
        $this->assertSame('ABCD12340000', CertificadoService::normalizarCodigo('abcd-1234-ooOo'));
    }
}

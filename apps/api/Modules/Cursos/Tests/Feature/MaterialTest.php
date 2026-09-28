<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Cursos\Models\Aula;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Material;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Services\MaterialService;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, seção 2 — materiais do curso: cadastro, PDF em disco privado e
 * acesso por perfil e liberação.
 */
final class MaterialTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private const PDF = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n";

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private User $aluno;

    private Curso $curso;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->aluno = $this->usuario($this->tenant, ['participante_cursos'], 'Aluno');
        $this->curso = $this->cursoPublicado($this->tenant);
        // Turma que já começou: materiais "0 dias após o início" já estão liberados.
        $this->turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor, ['data_inicio' => now()->subDays(2)->toDateString(), 'vagas' => 1]);
    }

    /**
     * @param array<string, mixed> $dados
     */
    private function material(array $dados = []): Material
    {
        return $this->noTenant($this->tenant, fn (): Material => app(MaterialService::class)->criar($this->curso, [
            'tipo' => 'texto', 'titulo' => 'Apostila', 'conteudo' => '<p>Conteúdo</p>', 'publicado' => true, ...$dados,
        ]));
    }

    private function materialComPdf(bool $publicado = true): Material
    {
        $material = $this->material(['tipo' => 'arquivo', 'titulo' => 'Apostila PDF', 'conteudo' => null, 'publicado' => false]);
        $this->noTenant($this->tenant, function () use ($material, $publicado): void {
            app(MaterialService::class)->definirArquivo($material, UploadedFile::fake()->createWithContent('apostila.pdf', self::PDF));
            $material->update(['publicado' => $publicado]);
        });

        return $material->refresh();
    }

    private function pdf(string $nome = 'apostila.pdf', string $conteudo = self::PDF): UploadedFile
    {
        // Arquivo real: o fake do Laravel deduz o MIME pela extensão, e aqui o que vale é o conteúdo.
        $caminho = (string) tempnam(sys_get_temp_dir(), 'material');
        file_put_contents($caminho, $conteudo);

        return new UploadedFile($caminho, $nome, null, null, true);
    }

    private function inscricaoConfirmada(User $user): Inscricao
    {
        return $this->inscrever($this->tenant, $this->turma, $user);
    }

    private function alterarStatus(Inscricao $inscricao, string $status): void
    {
        $this->noTenant($this->tenant, fn () => Inscricao::query()->whereKey($inscricao->id)->update(['status' => $status]));
    }

    // ---- 2.3 Cadastro ----

    public function test_administrador_cria_material_de_cada_tipo(): void
    {
        $base = "/api/cursos/cursos/{$this->curso->id}/materiais";

        $this->como($this->admin, $this->tenant)->postJson($base, ['tipo' => 'texto', 'titulo' => 'Texto', 'conteudo' => '<p>Olá</p>'])
            ->assertCreated()->assertJsonPath('tipo', 'texto')->assertJsonPath('publicado', false)->assertJsonPath('ordem', 1);
        $this->como($this->admin, $this->tenant)->postJson($base, ['tipo' => 'link', 'titulo' => 'Link', 'url' => 'https://exemplo.gov.br/x'])
            ->assertCreated()->assertJsonPath('url', 'https://exemplo.gov.br/x')->assertJsonPath('ordem', 2);
        $this->como($this->admin, $this->tenant)->postJson($base, ['tipo' => 'video', 'titulo' => 'Vídeo', 'url' => 'https://youtu.be/dQw4w9WgXcQ'])
            ->assertCreated()->assertJsonPath('embed_url', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
        $this->como($this->admin, $this->tenant)->postJson($base, ['tipo' => 'arquivo', 'titulo' => 'PDF'])
            ->assertCreated()->assertJsonPath('arquivo_nome', null);
    }

    public function test_video_de_provedor_nao_suportado_e_recusado(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/materiais", [
            'tipo' => 'video', 'titulo' => 'Vídeo', 'url' => 'https://dailymotion.com/video/x7tgad0',
        ]);

        $this->assertErroDeNegocio($resposta, 'YouTube e Vimeo');
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Material::count()));
    }

    public function test_link_com_esquema_diferente_de_http_e_recusado(): void
    {
        foreach (['javascript:alert(1)', 'ftp://exemplo.gov.br/x', 'exemplo.gov.br'] as $url) {
            $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/materiais", [
                'tipo' => 'link', 'titulo' => 'Link', 'url' => $url,
            ]);
            $this->assertErroDeNegocio($resposta, 'http');
        }
    }

    public function test_texto_e_salvo_sem_script_nem_atributos_de_evento(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/materiais", [
            'tipo' => 'texto', 'titulo' => 'Texto',
            'conteudo' => '<p onclick="roubar()">Olá</p><script>alert(1)</script><strong>negrito</strong>',
        ])->assertCreated();

        $conteudo = (string) $resposta->json('conteudo');
        $this->assertStringNotContainsString('<script', $conteudo);
        $this->assertStringNotContainsString('alert(1)', $conteudo);
        $this->assertStringNotContainsString('onclick', $conteudo);
        $this->assertStringContainsString('<strong>negrito</strong>', $conteudo);
    }

    public function test_regra_inicio_da_aula_sem_aula_e_recusada(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/materiais", [
            'tipo' => 'texto', 'titulo' => 'Texto', 'conteudo' => '<p>x</p>', 'liberacao_regra' => 'inicio_aula',
        ]);

        $this->assertErroDeNegocio($resposta, 'exige uma aula');
    }

    public function test_regra_de_dias_exige_o_numero_de_dias(): void
    {
        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/materiais", [
            'tipo' => 'texto', 'titulo' => 'Texto', 'conteudo' => '<p>x</p>', 'liberacao_regra' => 'dias_apos_inicio',
        ]);
        $this->assertErroDeNegocio($resposta, '0 a 365');

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/materiais", [
            'tipo' => 'texto', 'titulo' => 'Texto', 'conteudo' => '<p>x</p>', 'liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 366,
        ])->assertUnprocessable();
    }

    public function test_aula_de_outro_curso_e_recusada(): void
    {
        $outro = $this->cursoPublicado($this->tenant, ['titulo' => 'Outro curso']);
        $aulaAlheia = $this->aula($this->tenant, $outro);

        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$this->curso->id}/materiais", [
            'tipo' => 'texto', 'titulo' => 'Texto', 'conteudo' => '<p>x</p>', 'aula_id' => $aulaAlheia->id,
        ]);

        $this->assertErroDeNegocio($resposta, 'não pertence a este curso');
    }

    public function test_material_despublicado_some_para_o_participante_e_continua_para_o_administrador(): void
    {
        $this->inscricaoConfirmada($this->aluno);
        $material = $this->material();

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertOk();

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/materiais/{$material->id}", ['publicado' => false])
            ->assertOk()->assertJsonPath('publicado', false);

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertForbidden();
        $this->como($this->admin, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertOk();
    }

    public function test_tipo_do_material_nao_pode_ser_alterado(): void
    {
        $material = $this->material();

        $resposta = $this->como($this->admin, $this->tenant)->putJson("/api/cursos/materiais/{$material->id}", ['tipo' => 'link']);

        $this->assertErroDeNegocio($resposta, 'tipo do material não pode ser alterado');
    }

    public function test_atualizacao_parcial_preserva_o_restante_do_cadastro(): void
    {
        $material = $this->material(['descricao' => 'Leitura obrigatória']);

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/materiais/{$material->id}", ['titulo' => 'Novo título'])
            ->assertOk()->assertJsonPath('titulo', 'Novo título')->assertJsonPath('descricao', 'Leitura obrigatória')
            ->assertJsonPath('conteudo', '<p>Conteúdo</p>')->assertJsonPath('publicado', true);
    }

    public function test_reordenar_exige_todos_os_materiais_do_curso(): void
    {
        $a = $this->material(['titulo' => 'A']);
        $b = $this->material(['titulo' => 'B']);
        $c = $this->material(['titulo' => 'C']);
        $url = "/api/cursos/cursos/{$this->curso->id}/materiais/reordenar";

        $this->como($this->admin, $this->tenant)->postJson($url, ['ids' => [$c->id, $a->id, $b->id]])
            ->assertOk()->assertJsonPath('0.titulo', 'C')->assertJsonPath('1.titulo', 'A')->assertJsonPath('2.titulo', 'B');

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($url, ['ids' => [$a->id, $b->id]]), 'exatamente os materiais');
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->postJson($url, ['ids' => [$a->id, $a->id, $b->id, $c->id]]), 'exatamente os materiais');
    }

    public function test_material_de_arquivo_nao_e_publicado_sem_pdf(): void
    {
        $material = $this->material(['tipo' => 'arquivo', 'conteudo' => null, 'publicado' => false]);

        $resposta = $this->como($this->admin, $this->tenant)->putJson("/api/cursos/materiais/{$material->id}", ['publicado' => true]);

        $this->assertErroDeNegocio($resposta, 'Envie o arquivo PDF');
    }

    public function test_so_o_administrador_gerencia_materiais(): void
    {
        $material = $this->material();
        $base = "/api/cursos/cursos/{$this->curso->id}/materiais";

        foreach ([$this->instrutor, $this->aluno] as $usuario) {
            $this->como($usuario, $this->tenant)->postJson($base, ['tipo' => 'texto', 'titulo' => 'x', 'conteudo' => 'x'])->assertForbidden();
            $this->como($usuario, $this->tenant)->putJson("/api/cursos/materiais/{$material->id}", ['titulo' => 'x'])->assertForbidden();
            $this->como($usuario, $this->tenant)->deleteJson("/api/cursos/materiais/{$material->id}")->assertForbidden();
        }
    }

    public function test_listagem_de_gestao_e_do_administrador_e_do_instrutor_do_curso(): void
    {
        $this->material(['publicado' => false]);
        $base = "/api/cursos/cursos/{$this->curso->id}/materiais";

        $this->como($this->admin, $this->tenant)->getJson($base)->assertOk()->assertJsonCount(1);
        $this->como($this->instrutor, $this->tenant)->getJson($base)->assertOk()->assertJsonCount(1);
        $this->como($this->aluno, $this->tenant)->getJson($base)->assertForbidden();
    }

    public function test_instrutor_de_outro_curso_nao_ve_os_materiais(): void
    {
        $this->material();
        $outroInstrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Outro instrutor');

        $this->como($outroInstrutor, $this->tenant)->getJson("/api/cursos/cursos/{$this->curso->id}/materiais")->assertForbidden();
    }

    // ---- 2.4 PDF ----

    public function test_pdf_valido_vai_para_o_disco_privado_com_nome_aleatorio(): void
    {
        $material = $this->material(['tipo' => 'arquivo', 'conteudo' => null, 'publicado' => false]);

        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/materiais/{$material->id}/arquivo", ['arquivo' => $this->pdf('Minha Apostila.pdf')])
            ->assertOk()->assertJsonPath('arquivo_nome', 'Minha Apostila.pdf');

        $resposta->assertJsonMissingPath('arquivo_path');
        $caminho = (string) $material->refresh()->arquivo_path;
        $this->assertMatchesRegularExpression("#^cursos/{$this->tenant->id}/materiais/[0-9a-f-]{36}\.pdf$#", $caminho);
        Storage::disk('local')->assertExists($caminho);
        Storage::disk('public')->assertMissing($caminho);
    }

    public function test_arquivo_com_extensao_pdf_e_conteudo_de_outro_tipo_e_recusado(): void
    {
        $material = $this->material(['tipo' => 'arquivo', 'conteudo' => null, 'publicado' => false]);

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/materiais/{$material->id}/arquivo", ['arquivo' => $this->pdf('falso.pdf', '<?php echo 1;')])
            ->assertUnprocessable()->assertJsonValidationErrors('arquivo');

        $this->assertNull($material->refresh()->arquivo_path);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_pdf_acima_de_20_mb_e_recusado(): void
    {
        $material = $this->material(['tipo' => 'arquivo', 'conteudo' => null, 'publicado' => false]);
        $grande = $this->pdf('grande.pdf', self::PDF . str_repeat('0', 21 * 1024 * 1024));

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/materiais/{$material->id}/arquivo", ['arquivo' => $grande])
            ->assertUnprocessable()->assertJsonValidationErrors('arquivo');
    }

    public function test_substituir_o_pdf_apaga_o_anterior_e_mantem_o_cadastro(): void
    {
        $material = $this->materialComPdf();
        $anterior = (string) $material->arquivo_path;

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/materiais/{$material->id}/arquivo", ['arquivo' => $this->pdf('nova.pdf')])
            ->assertOk()->assertJsonPath('arquivo_nome', 'nova.pdf')->assertJsonPath('titulo', 'Apostila PDF')->assertJsonPath('publicado', true);

        $atual = (string) $material->refresh()->arquivo_path;
        $this->assertNotSame($anterior, $atual);
        Storage::disk('local')->assertMissing($anterior);
        Storage::disk('local')->assertExists($atual);
    }

    public function test_pdf_so_pode_ser_enviado_a_material_do_tipo_arquivo(): void
    {
        $material = $this->material();

        $resposta = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/materiais/{$material->id}/arquivo", ['arquivo' => $this->pdf()]);

        $this->assertErroDeNegocio($resposta, 'tipo arquivo');
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_excluir_o_material_apaga_o_pdf(): void
    {
        $material = $this->materialComPdf();
        $caminho = (string) $material->arquivo_path;

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/materiais/{$material->id}")->assertOk();

        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Material::count()));
        Storage::disk('local')->assertMissing($caminho);
    }

    // ---- 2.5 Acesso ----

    public function test_participante_confirmado_abre_material_liberado_e_baixa_o_pdf(): void
    {
        $this->inscricaoConfirmada($this->aluno);
        $material = $this->materialComPdf();

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertOk()->assertJsonMissingPath('arquivo_path');

        $resposta = $this->como($this->aluno, $this->tenant)->get("/api/cursos/materiais/{$material->id}/arquivo");
        $resposta->assertOk();
        $resposta->assertHeader('Content-Type', 'application/pdf');
        $resposta->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('inline', (string) $resposta->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF-', $resposta->streamedContent());
    }

    public function test_participante_em_lista_de_espera_recebe_403(): void
    {
        $this->inscricaoConfirmada($this->usuario($this->tenant, ['participante_cursos'], 'Primeiro'));
        $inscricao = $this->inscricaoConfirmada($this->aluno);
        $this->assertSame('lista_espera', $inscricao->status);
        $material = $this->materialComPdf();

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertForbidden();
        $this->como($this->aluno, $this->tenant)->get("/api/cursos/materiais/{$material->id}/arquivo")->assertForbidden();
    }

    public function test_pendente_recusada_e_cancelada_nao_dao_acesso(): void
    {
        $inscricao = $this->inscricaoConfirmada($this->aluno);
        $material = $this->material();

        foreach (['pendente', 'cancelada'] as $status) {
            $this->alterarStatus($inscricao, $status);
            $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertForbidden();
        }
    }

    public function test_quem_nao_esta_inscrito_no_curso_recebe_403(): void
    {
        $material = $this->material();

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertForbidden();
    }

    public function test_pdf_sem_login_responde_401(): void
    {
        $material = $this->materialComPdf();

        $this->getJson("/api/cursos/materiais/{$material->id}/arquivo")->assertUnauthorized();
        $this->getJson("/api/cursos/materiais/{$material->id}")->assertUnauthorized();
    }

    public function test_consulta_depois_da_conclusao_entrega_o_conteudo(): void
    {
        $inscricao = $this->inscricaoConfirmada($this->aluno);
        $material = $this->material();

        foreach (['concluida', 'nao_concluida'] as $status) {
            $this->alterarStatus($inscricao, $status);
            $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertOk()->assertJsonPath('titulo', 'Apostila');
        }
    }

    public function test_instrutor_da_turma_abre_material_antes_da_liberacao_e_nao_publicado(): void
    {
        $material = $this->material(['liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 200, 'publicado' => false]);

        $this->como($this->instrutor, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertOk();
    }

    public function test_material_nao_liberado_e_recusado_ao_participante_ate_o_horario(): void
    {
        $this->inscricaoConfirmada($this->aluno);
        $aula = $this->aula($this->tenant, $this->curso);
        $this->agendamento($this->tenant, $this->turma, $aula, now()->addHour());
        $material = $this->material(['aula_id' => $aula->id, 'liberacao_regra' => 'inicio_aula']);

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertForbidden();

        $this->travarRelogio(now()->addHour()->addMinute());
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertOk();
    }

    public function test_aula_vinculada_sem_agendamento_mantem_o_material_bloqueado(): void
    {
        $this->inscricaoConfirmada($this->aluno);
        $aula = $this->aula($this->tenant, $this->curso);
        $material = $this->material(['aula_id' => $aula->id, 'liberacao_regra' => 'inicio_aula']);

        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertForbidden();
    }

    public function test_material_de_dias_apos_o_inicio_depende_da_turma(): void
    {
        $this->inscricaoConfirmada($this->aluno);
        $material = $this->material(['liberacao_regra' => 'dias_apos_inicio', 'liberacao_dias' => 5]);

        // A turma começou há 2 dias: faltam 3.
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertForbidden();

        $this->travarRelogio(now()->addDays(3));
        $this->como($this->aluno, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}")->assertOk();
    }

    public function test_material_e_arquivo_de_outro_tenant_respondem_404(): void
    {
        $tenantB = $this->criarTenant('prefeitura-b');
        $adminB = $this->usuario($tenantB, ['admin_cursos'], 'Admin B');
        $material = $this->materialComPdf();

        $this->como($adminB, $tenantB)->getJson("/api/cursos/materiais/{$material->id}")->assertNotFound();
        $this->como($adminB, $tenantB)->get("/api/cursos/materiais/{$material->id}/arquivo")->assertNotFound();
        $this->como($adminB, $tenantB)->putJson("/api/cursos/materiais/{$material->id}", ['titulo' => 'x'])->assertNotFound();
        $this->como($adminB, $tenantB)->deleteJson("/api/cursos/materiais/{$material->id}")->assertNotFound();
        $this->como($adminB, $tenantB)->postJson("/api/cursos/materiais/{$material->id}/arquivo", ['arquivo' => $this->pdf()])->assertNotFound();
        $this->como($adminB, $tenantB)->getJson("/api/cursos/cursos/{$this->curso->id}/materiais")->assertNotFound();
    }

    public function test_material_sem_pdf_responde_404_no_endpoint_de_arquivo(): void
    {
        $material = $this->material();

        $this->como($this->admin, $this->tenant)->getJson("/api/cursos/materiais/{$material->id}/arquivo")->assertNotFound();
    }

    private function travarRelogio(\DateTimeInterface $momento): void
    {
        \Carbon\Carbon::setTestNow($momento);
        \Carbon\CarbonImmutable::setTestNow($momento);
    }

    protected function tearDown(): void
    {
        \Carbon\Carbon::setTestNow();
        \Carbon\CarbonImmutable::setTestNow();
        parent::tearDown();
    }
}

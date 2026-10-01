<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\CampoInscricao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\RespostaInscricao;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 4.2 — CampoInscricaoService e controller (design D9): CRUD, reordenar, desativar; campo
 * respondido não é excluído; tipo `selecao` exige opções.
 */
final class CampoInscricaoTest extends TestCase
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

    private function base(): string
    {
        return "/api/cursos/cursos/{$this->curso->id}/campos-inscricao";
    }

    public function test_cria_campo_de_texto(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Restrição alimentar', 'tipo' => 'texto'])
            ->assertCreated()
            ->assertJsonPath('rotulo', 'Restrição alimentar')
            ->assertJsonPath('tipo', 'texto')
            ->assertJsonPath('ativo', true)
            ->assertJsonPath('obrigatorio', false)
            ->assertJsonPath('ordem', 1);
    }

    public function test_segundo_campo_ganha_a_proxima_ordem(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Campo 1', 'tipo' => 'texto'])->assertCreated();
        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Campo 2', 'tipo' => 'texto'])
            ->assertCreated()->assertJsonPath('ordem', 2);
    }

    public function test_cenario_validacao_do_cadastro_do_campo(): void
    {
        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['tipo' => 'texto'])
            ->assertUnprocessable()->assertJsonValidationErrors('rotulo');

        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Campo', 'tipo' => 'invalido'])
            ->assertUnprocessable()->assertJsonValidationErrors('tipo');

        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => str_repeat('a', 161), 'tipo' => 'texto'])
            ->assertUnprocessable()->assertJsonValidationErrors('rotulo');
    }

    public function test_tipo_selecao_exige_pelo_menos_uma_opcao(): void
    {
        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Turno', 'tipo' => 'selecao']),
            'pelo menos uma opção',
        );

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Turno', 'tipo' => 'selecao', 'opcoes' => []]),
            'pelo menos uma opção',
        );

        $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Turno', 'tipo' => 'selecao', 'opcoes' => ['Manhã', 'Tarde']])
            ->assertCreated()->assertJsonPath('opcoes', ['Manhã', 'Tarde']);
    }

    public function test_atualiza_rotulo_e_obrigatoriedade(): void
    {
        $id = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Campo', 'tipo' => 'texto'])->json('id');

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/campos-inscricao/{$id}", ['rotulo' => 'Campo Editado', 'obrigatorio' => true])
            ->assertOk()
            ->assertJsonPath('rotulo', 'Campo Editado')
            ->assertJsonPath('obrigatorio', true);
    }

    public function test_reordena_os_campos_do_curso(): void
    {
        $a = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'A', 'tipo' => 'texto'])->json('id');
        $b = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'B', 'tipo' => 'texto'])->json('id');

        $this->como($this->admin, $this->tenant)->postJson("{$this->base()}/reordenar", ['ids' => [$b, $a]])->assertOk();

        $ordenados = $this->como($this->admin, $this->tenant)->getJson($this->base())->assertOk()->json();
        $this->assertSame([$b, $a], array_column($ordenados, 'id'));
    }

    public function test_reordenar_com_id_de_outro_curso_e_recusado(): void
    {
        $a = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'A', 'tipo' => 'texto'])->json('id');
        $outroCurso = $this->cursoPublicado($this->tenant, ['titulo' => 'Outro Curso']);
        $outroCampo = $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/cursos/{$outroCurso->id}/campos-inscricao", ['rotulo' => 'X', 'tipo' => 'texto'])->json('id');

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("{$this->base()}/reordenar", ['ids' => [$a, $outroCampo]]),
            'exatamente os campos do curso',
        );
    }

    public function test_cenario_exclusao_de_campo_respondido(): void
    {
        $id = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Campo', 'tipo' => 'texto'])->json('id');
        $campo = CampoInscricao::findOrFail($id);

        $turma = $this->turmaAberta($this->tenant, $this->curso, $this->instrutor);
        $this->noTenant($this->tenant, function () use ($campo, $turma): void {
            $participante = Participante::create(['nome' => 'Aluno', 'email' => 'aluno@teste.gov.br']);
            $inscricao = Inscricao::create(['turma_id' => $turma->id, 'participante_id' => $participante->id, 'status' => 'confirmada']);
            RespostaInscricao::create(['inscricao_id' => $inscricao->id, 'campo_id' => $campo->id, 'rotulo' => $campo->rotulo, 'tipo' => $campo->tipo, 'valor' => 'P']);
        });

        $resposta = $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/campos-inscricao/{$id}");
        $this->assertErroDeNegocio($resposta, 'já tem respostas');
        $this->assertStringContainsString('Desative', (string) $resposta->json('error'));
        $this->assertSame(1, $this->noTenant($this->tenant, fn () => CampoInscricao::count()));

        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/campos-inscricao/{$id}/desativar")->assertOk()->assertJsonPath('ativo', false);
        $this->como($this->admin, $this->tenant)->postJson("/api/cursos/campos-inscricao/{$id}/ativar")->assertOk()->assertJsonPath('ativo', true);
    }

    public function test_campo_sem_resposta_pode_ser_excluido(): void
    {
        $id = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Campo', 'tipo' => 'texto'])->json('id');

        $this->como($this->admin, $this->tenant)->deleteJson("/api/cursos/campos-inscricao/{$id}")->assertOk()->assertJson(['deleted' => true]);
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => CampoInscricao::count()));
    }

    public function test_isolamento_entre_tenants(): void
    {
        $id = $this->como($this->admin, $this->tenant)->postJson($this->base(), ['rotulo' => 'Campo', 'tipo' => 'texto'])->json('id');

        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroAdmin = $this->usuario($outroTenant, ['admin_cursos'], 'Admin B');

        $this->como($outroAdmin, $outroTenant)->putJson("/api/cursos/campos-inscricao/{$id}", ['rotulo' => 'Invasão'])->assertNotFound();
    }
}

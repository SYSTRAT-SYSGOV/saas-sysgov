<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 3.3 — catálogo público e página do curso (design D7, "Turmas abertas ao público
 * externo"): só turma `aberta`, `aceita_externos` e dentro do período de inscrição, de curso
 * `publicado`; nenhum campo interno (e-mail de instrutor, vagas totais) sai.
 */
final class CatalogoPublicoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $instrutor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->tenant->update(['settings' => ['cursos' => ['publico_habilitado' => true]]]);
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor Sigiloso');
    }

    private function turmaAbertaExternos(Curso $curso, bool $aceitaExternos = true): Turma
    {
        return $this->turmaAberta($this->tenant, $curso, $this->instrutor, ['aceita_externos' => $aceitaExternos]);
    }

    public function test_cenario_oferta_publica_lista_so_turmas_que_aceitam_externos(): void
    {
        $cursoAberto = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Aberto a Externos']);
        $this->turmaAbertaExternos($cursoAberto, aceitaExternos: true);

        $cursoFechado = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Só Servidores']);
        $this->turmaAbertaExternos($cursoFechado, aceitaExternos: false);

        $resposta = $this->getJson("/api/public/cursos/{$this->tenant->slug}/catalogo")->assertOk();

        $titulos = collect((array) $resposta->json())->pluck('titulo');
        $this->assertTrue($titulos->contains('Curso Aberto a Externos'));
        $this->assertFalse($titulos->contains('Curso Só Servidores'));
    }

    public function test_curso_rascunho_nao_aparece_na_oferta_publica(): void
    {
        $rascunho = $this->noTenant($this->tenant, fn () => app(\Modules\Cursos\Services\CursoService::class)->criar(
            ['titulo' => 'Curso Ainda Não Publicado', 'carga_horaria_minutos' => 60],
            $this->instrutor,
        ));
        $this->turmaAbertaExternos($rascunho);

        $resposta = $this->getJson("/api/public/cursos/{$this->tenant->slug}/catalogo")->assertOk();
        $this->assertFalse(collect((array) $resposta->json())->pluck('titulo')->contains('Curso Ainda Não Publicado'));
    }

    public function test_curso_publicado_sem_turma_aberta_a_externos_nao_aparece(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Sem Turma Externa']);
        $this->turmaAbertaExternos($curso, aceitaExternos: false);

        $resposta = $this->getJson("/api/public/cursos/{$this->tenant->slug}/catalogo")->assertOk();
        $this->assertFalse(collect((array) $resposta->json())->pluck('titulo')->contains('Sem Turma Externa'));
    }

    public function test_cenario_nenhum_campo_interno_sai_no_catalogo(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Público']);
        $this->turmaAbertaExternos($curso);

        $conteudo = $this->getJson("/api/public/cursos/{$this->tenant->slug}/catalogo")->assertOk()->getContent();

        $this->assertStringNotContainsString($this->instrutor->email, (string) $conteudo);
        $this->assertStringNotContainsString('"vagas"', (string) $conteudo);
    }

    public function test_pagina_do_curso_traz_texto_publico_capa_e_turmas_com_vagas_restantes(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Gestão de Contratos', 'texto_publico' => '<p>Inscreva-se já</p>']);
        $turma = $this->turmaAbertaExternos($curso);
        $curso->refresh();

        $resposta = $this->getJson("/api/public/cursos/{$this->tenant->slug}/cursos/{$curso->slug}")->assertOk();

        $resposta->assertJsonPath('slug', $curso->slug)
            ->assertJsonPath('titulo', 'Gestão de Contratos')
            ->assertJsonPath('texto_publico', '<p>Inscreva-se já</p>')
            ->assertJsonPath('turmas.0.id', $turma->id)
            ->assertJsonPath('turmas.0.vagas_restantes', $turma->vagas);

        $this->assertStringNotContainsString($this->instrutor->email, $resposta->getContent());
        $this->assertStringNotContainsString('"vagas"', $resposta->getContent());
    }

    public function test_pagina_de_curso_inexistente_ou_nao_publicado_responde_404(): void
    {
        $this->getJson("/api/public/cursos/{$this->tenant->slug}/cursos/nao-existe")->assertNotFound();

        $rascunho = $this->noTenant($this->tenant, fn () => app(\Modules\Cursos\Services\CursoService::class)->criar(
            ['titulo' => 'Ainda Rascunho', 'carga_horaria_minutos' => 60],
            $this->instrutor,
        ));
        $this->getJson("/api/public/cursos/{$this->tenant->slug}/cursos/{$rascunho->slug}")->assertNotFound();
    }

    public function test_isolamento_entre_orgaos_no_catalogo_e_na_pagina_do_curso(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroTenant->update(['settings' => ['cursos' => ['publico_habilitado' => true]]]);
        $outroInstrutor = $this->usuario($outroTenant, ['instrutor_cursos'], 'Instrutor B');
        $cursoB = $this->cursoPublicado($outroTenant, ['titulo' => 'Curso Do Órgão B']);
        $this->turmaAberta($outroTenant, $cursoB, $outroInstrutor, ['aceita_externos' => true]);

        $cursoA = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Do Órgão A']);
        $this->turmaAbertaExternos($cursoA);

        $respostaA = $this->getJson("/api/public/cursos/{$this->tenant->slug}/catalogo")->assertOk();
        $this->assertFalse(collect((array) $respostaA->json())->pluck('titulo')->contains('Curso Do Órgão B'));

        $this->getJson("/api/public/cursos/{$this->tenant->slug}/cursos/{$cursoB->slug}")->assertNotFound();
    }
}

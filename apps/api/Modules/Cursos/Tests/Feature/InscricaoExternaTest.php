<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Participante;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 3.4 — regra de externo na inscrição (design D7/D11): `InscricaoService` recusa turma
 * sem `aceita_externos`, e o catálogo autenticado já não oferece essas turmas a um externo.
 */
final class InscricaoExternaTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $instrutor;

    private User $externo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $this->externo = $this->usuario($this->tenant, ['participante_externo_cursos'], 'Externo');

        $this->noTenant($this->tenant, fn () => Participante::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->externo->id,
            'nome' => $this->externo->name,
            'email' => $this->externo->email,
            'origem' => Participante::ORIGEM_EXTERNO,
            'consentimento_em' => now(),
        ]));
    }

    private function turma(bool $aceitaExternos): Turma
    {
        $curso = $this->cursoPublicado($this->tenant);

        return $this->turmaAberta($this->tenant, $curso, $this->instrutor, ['aceita_externos' => $aceitaExternos]);
    }

    public function test_cenario_turma_fechada_a_externos_recusa_a_inscricao(): void
    {
        $turma = $this->turma(aceitaExternos: false);

        $this->assertErroDeNegocio(
            $this->como($this->externo, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes", []),
            'não aceita participantes externos',
        );
    }

    public function test_turma_aberta_a_externos_aceita_a_inscricao(): void
    {
        $turma = $this->turma(aceitaExternos: true);

        $this->como($this->externo, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes", [])->assertCreated();
    }

    public function test_servidor_se_inscreve_normalmente_em_turma_fechada_a_externos(): void
    {
        $servidor = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor');
        $turma = $this->turma(aceitaExternos: false);

        $this->como($servidor, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes", [])->assertCreated();
    }

    public function test_administrador_tambem_e_recusado_ao_inscrever_externo_direto_em_turma_fechada(): void
    {
        $turma = $this->turma(aceitaExternos: false);

        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson("/api/cursos/turmas/{$turma->id}/inscricoes/direta", ['user_id' => $this->externo->id]),
            'não aceita participantes externos',
        );
    }

    public function test_cenario_externo_em_turma_fechada_a_externos_nao_aparece_no_catalogo(): void
    {
        $cursoFechado = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Fechado a Externos']);
        $this->turmaAberta($this->tenant, $cursoFechado, $this->instrutor, ['aceita_externos' => false]);

        $cursoAberto = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Aberto a Externos']);
        $this->turmaAberta($this->tenant, $cursoAberto, $this->instrutor, ['aceita_externos' => true]);

        $catalogo = $this->como($this->externo, $this->tenant)->getJson('/api/cursos/catalogo')->assertOk()->json();

        $porTitulo = collect((array) $catalogo)->keyBy('titulo');
        $this->assertEmpty($porTitulo['Curso Fechado a Externos']['turmas']);
        $this->assertNotEmpty($porTitulo['Curso Aberto a Externos']['turmas']);
    }

    public function test_catalogo_do_servidor_continua_vendo_turmas_fechadas_a_externos(): void
    {
        $servidor = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor');
        $curso = $this->cursoPublicado($this->tenant, ['titulo' => 'Curso Fechado a Externos']);
        $this->turmaAberta($this->tenant, $curso, $this->instrutor, ['aceita_externos' => false]);

        $catalogo = $this->como($servidor, $this->tenant)->getJson('/api/cursos/catalogo')->assertOk()->json();

        $porTitulo = collect((array) $catalogo)->keyBy('titulo');
        $this->assertNotEmpty($porTitulo['Curso Fechado a Externos']['turmas']);
    }
}

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
 * Tarefa 2.2 — papel `participante_externo_cursos` (design D6): mesmas permissões do
 * participante servidor (`cursos.view`, `cursos.participar`), mas fora da busca de instrutores e
 * de inscrição direta (`UsuarioOrgaoController`).
 */
final class ParticipanteExternoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    private User $externo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
        $this->externo = $this->usuario($this->tenant, ['participante_externo_cursos'], 'Externo');
    }

    public function test_externo_nao_e_oferecido_como_instrutor(): void
    {
        $servidor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Servidor Instrutor');

        $resultado = $this->como($this->admin, $this->tenant)
            ->getJson('/api/cursos/usuarios')
            ->assertOk()
            ->json();

        $ids = array_column($resultado, 'id');
        $this->assertContains($servidor->id, $ids);
        $this->assertNotContains($this->externo->id, $ids);
    }

    public function test_externo_entra_e_ve_so_o_proprio_conteudo(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');
        $turma = $this->turmaAberta($this->tenant, $curso, $instrutor);
        $outroParticipante = $this->usuario($this->tenant, ['participante_cursos'], 'Servidor');

        $inscricaoExterno = $this->inscrever($this->tenant, $turma, $this->externo);
        $inscricaoOutro = $this->inscrever($this->tenant, $turma, $outroParticipante);

        $this->como($this->externo, $this->tenant)
            ->getJson("/api/cursos/inscricoes/{$inscricaoExterno->id}/conteudo")
            ->assertOk();

        $this->como($this->externo, $this->tenant)
            ->getJson("/api/cursos/inscricoes/{$inscricaoOutro->id}/conteudo")
            ->assertForbidden();
    }
}

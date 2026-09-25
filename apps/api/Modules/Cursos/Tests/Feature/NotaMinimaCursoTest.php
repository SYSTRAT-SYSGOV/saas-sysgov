<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Fase 2, tarefa 3.4 — nota mínima no cadastro do curso (0 a 10, não vale em evento).
 */
final class NotaMinimaCursoTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
    }

    /**
     * @param array<string, mixed> $alteracoes
     * @return array<string, mixed>
     */
    private function dados(array $alteracoes = []): array
    {
        return ['titulo' => 'Gestão de Contratos', 'carga_horaria_minutos' => 480, ...$alteracoes];
    }

    public function test_aceita_nota_minima_na_escala_de_0_a_10(): void
    {
        foreach ([0, 5, 7.5, 10] as $nota) {
            $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['nota_minima' => $nota]))
                ->assertCreated()->assertJsonPath('nota_minima', number_format((float) $nota, 2, '.', ''));
        }
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['nota_minima' => null]))->assertCreated()->assertJsonPath('nota_minima', null);
    }

    public function test_nota_minima_fora_da_escala_e_recusada_com_mensagem_da_escala(): void
    {
        foreach ([11, 10.01, -1] as $nota) {
            $resposta = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['nota_minima' => $nota]))
                ->assertUnprocessable()->assertJsonValidationErrors('nota_minima');
            $this->assertStringContainsString('0 a 10', (string) $resposta->json('errors.nota_minima.0'));
        }

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['nota_minima' => 'abc']))->assertUnprocessable()->assertJsonValidationErrors('nota_minima');
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Curso::count()));
    }

    public function test_atualiza_a_nota_minima_de_um_curso(): void
    {
        $curso = $this->cursoPublicado($this->tenant);

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$curso->id}", ['nota_minima' => 7])->assertOk()->assertJsonPath('nota_minima', '7.00');
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$curso->id}", ['nota_minima' => 11])->assertUnprocessable();
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$curso->id}", ['nota_minima' => null])->assertOk()->assertJsonPath('nota_minima', null);
    }

    public function test_evento_nao_aceita_nota_minima(): void
    {
        $this->assertErroDeNegocio(
            $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['tipo' => 'evento', 'nota_minima' => 7])),
            'Eventos não têm avaliação',
        );

        $evento = $this->cursoPublicado($this->tenant, ['tipo' => 'evento', 'titulo' => 'Seminário']);
        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$evento->id}", ['nota_minima' => 7]), 'Eventos não têm avaliação');
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$evento->id}", ['titulo' => 'Seminário 2026'])->assertOk();
    }

    public function test_curso_com_nota_minima_nao_vira_evento_sem_limpar_a_nota(): void
    {
        $curso = $this->cursoPublicado($this->tenant, ['nota_minima' => 7]);

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$curso->id}", ['tipo' => 'evento']), 'Eventos não têm avaliação');
        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$curso->id}", ['tipo' => 'evento', 'nota_minima' => null])->assertOk()->assertJsonPath('tipo', 'evento');
    }

    public function test_curso_com_avaliacoes_nao_vira_evento(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $this->noTenant($this->tenant, fn () => Avaliacao::create(['curso_id' => $curso->id, 'titulo' => 'Prova']));

        $this->assertErroDeNegocio($this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$curso->id}", ['tipo' => 'evento']), 'tem avaliações');
    }
}

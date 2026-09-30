<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 3.1 — slug/texto_publico do curso e aceita_externos da turma (design D11): campos da
 * página pública, ainda sem os endpoints públicos em si (tarefas 3.2/3.3).
 */
final class CursoPaginaPublicaTest extends TestCase
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

    public function test_slug_nao_informado_e_gerado_do_titulo(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados())
            ->assertCreated()
            ->assertJsonPath('slug', 'gestao-de-contratos');
    }

    public function test_slug_repetido_no_mesmo_tenant_ganha_sufixo(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados())->assertCreated();

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados())
            ->assertCreated()
            ->assertJsonPath('slug', 'gestao-de-contratos-2');
    }

    public function test_slug_informado_manualmente_e_aceito(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['slug' => 'contratos-2026']))
            ->assertCreated()
            ->assertJsonPath('slug', 'contratos-2026');
    }

    public function test_slug_informado_manualmente_duplicado_e_rejeitado(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['slug' => 'contratos-2026']))->assertCreated();

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['titulo' => 'Outro Curso', 'slug' => 'contratos-2026']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('slug');
    }

    public function test_slug_com_maiuscula_ou_espaco_e_rejeitado(): void
    {
        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['slug' => 'Contratos 2026']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('slug');
    }

    public function test_slug_pode_se_repetir_entre_tenants_diferentes(): void
    {
        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroAdmin = $this->usuario($outroTenant, ['admin_cursos'], 'Admin B');

        $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['slug' => 'contratos']))->assertCreated();
        $this->como($outroAdmin, $outroTenant)->postJson('/api/cursos/cursos', $this->dados(['slug' => 'contratos']))->assertCreated();
    }

    public function test_slug_pode_ser_editado_e_continua_unico_no_tenant(): void
    {
        $primeiro = $this->cursoPublicado($this->tenant);
        $segundo = $this->cursoPublicado($this->tenant, ['titulo' => 'Outro Curso']);

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$segundo->id}", ['slug' => $primeiro->slug])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('slug');

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/cursos/{$segundo->id}", ['slug' => 'novo-endereco'])
            ->assertOk()
            ->assertJsonPath('slug', 'novo-endereco');
    }

    public function test_cenario_texto_de_divulgacao_com_script(): void
    {
        $malicioso = '<p>Inscreva-se</p><script>alert(1)</script><img src=x onerror=alert(1)>';

        $resposta = $this->como($this->admin, $this->tenant)->postJson('/api/cursos/cursos', $this->dados(['texto_publico' => $malicioso]))
            ->assertCreated();

        $textoGravado = $resposta->json('texto_publico');
        $this->assertStringNotContainsString('<script', $textoGravado);
        $this->assertStringNotContainsString('onerror', $textoGravado);
        $this->assertStringContainsString('<p>Inscreva-se</p>', $textoGravado);

        $curso = Curso::findOrFail($resposta->json('id'));
        $this->assertStringNotContainsString('<script', (string) $curso->texto_publico);
    }

    public function test_turma_nao_aceita_externos_por_padrao_e_pode_ser_habilitada(): void
    {
        $curso = $this->cursoPublicado($this->tenant);
        $instrutor = $this->usuario($this->tenant, ['instrutor_cursos'], 'Instrutor');

        $criada = $this->como($this->admin, $this->tenant)->postJson("/api/cursos/cursos/{$curso->id}/turmas", [
            'nome' => 'Turma 1',
            'data_inicio' => now()->addDays(10)->toDateString(),
            'data_fim' => now()->addDays(40)->toDateString(),
            'inscricoes_inicio' => now()->subDay()->toDateTimeString(),
            'inscricoes_fim' => now()->addDays(5)->toDateTimeString(),
            'vagas' => 10,
            'modalidade' => 'presencial',
            'local' => 'Auditório',
            'instrutores' => [$instrutor->id],
        ])->assertCreated()->assertJsonPath('aceita_externos', false);

        $turmaId = $criada->json('id');

        $this->como($this->admin, $this->tenant)->putJson("/api/cursos/turmas/{$turmaId}", ['aceita_externos' => true])
            ->assertOk()
            ->assertJsonPath('aceita_externos', true);
    }
}

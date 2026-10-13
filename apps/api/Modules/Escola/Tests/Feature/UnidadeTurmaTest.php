<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Modules\Escola\Models\Materia;
use Modules\Escola\Models\TurmaMateria;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/** Tarefas 2.1 e 2.2 — unidade (nome/logo) e turmas (unicidade, exclusão, duplicação). */
final class UnidadeTurmaTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    public function test_unidade_usa_nome_do_tenant_e_pode_ser_renomeada(): void
    {
        $tenant = $this->criarTenant('escola-modelo');
        $direcao = $this->usuario($tenant);

        $this->como($direcao, $tenant)->getJson('/api/escola/unidade')->assertOk()->assertJsonPath('nome', 'Escola Escola Modelo');
        $this->como($direcao, $tenant)->putJson('/api/escola/unidade', ['nome' => 'Colégio Estadual Modelo'])->assertOk()->assertJsonPath('nome', 'Colégio Estadual Modelo');
    }

    public function test_logo_rejeita_arquivo_que_nao_e_imagem(): void
    {
        Storage::fake('local');
        $tenant = $this->criarTenant();
        // Arquivo real (não fake): o fake informa o MIME pela extensão e mascararia a checagem de conteúdo.
        $caminho = tempnam(sys_get_temp_dir(), 'logo');
        file_put_contents($caminho, "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n");
        $pdfRenomeado = new UploadedFile($caminho, 'logo.png', null, null, true);

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/escola/unidade/logo', ['logo' => $pdfRenomeado])
            ->assertStatus(422)->assertJsonValidationErrors('logo');
    }

    public function test_logo_valido_fica_privado_e_so_o_tenant_ve(): void
    {
        Storage::fake('local');
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');

        $this->como($this->usuario($tenantA), $tenantA)
            ->postJson('/api/escola/unidade/logo', ['logo' => UploadedFile::fake()->image('logo.png', 120, 120)])
            ->assertOk()->assertJsonPath('tem_logo', true);

        $this->como($this->usuario($tenantA), $tenantA)->get('/api/escola/unidade/logo')->assertOk();
        $this->como($this->usuario($tenantB), $tenantB)->get('/api/escola/unidade/logo')->assertNotFound();
        // Logo guardado por escola (a "unidade" é a escola de trabalho).
        $this->assertCount(1, Storage::disk('local')->allFiles("escola/{$tenantA->id}/escolas"));
    }

    public function test_turnos_padrao_sao_criados_na_primeira_consulta(): void
    {
        $tenant = $this->criarTenant();

        $this->como($this->usuario($tenant), $tenant)->getJson('/api/escola/turnos')
            ->assertOk()->assertJsonCount(3)->assertJsonPath('0.nome', 'Manhã');
    }

    public function test_turma_duplicada_no_mesmo_turno_e_ano_e_rejeitada(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant, '6º A');

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/escola/turmas', ['nome' => '6º A', 'turno_id' => $turma->turno_id, 'ano_letivo' => 2026])
            ->assertStatus(422)->assertJsonValidationErrors('nome');
        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/escola/turmas', ['nome' => '6º A', 'turno_id' => $turma->turno_id, 'ano_letivo' => 2027])
            ->assertCreated();
    }

    public function test_excluir_turma_mantem_alunos_sem_turma(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        for ($i = 1; $i <= 30; $i++) {
            $this->aluno($tenant, $turma, "Aluno {$i}");
        }

        $this->como($this->usuario($tenant), $tenant)->deleteJson("/api/escola/turmas/{$turma->id}")->assertOk();

        $this->assertSoftDeleted('escola_turmas', ['id' => $turma->id]);
        $this->assertSame(30, \Modules\Escola\Models\Aluno::withoutGlobalScopes()->whereNull('turma_id')->whereNull('deleted_at')->count());
    }

    public function test_duplicar_turma_copia_materias_sem_alunos(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant, '8º A');
        $this->aluno($tenant, $turma, 'Aluno Original');
        $this->noTenant($tenant, function () use ($turma): void {
            for ($i = 1; $i <= 7; $i++) {
                TurmaMateria::create(['turma_id' => $turma->id, 'materia_id' => Materia::create(['nome' => "Matéria {$i}"])->id]);
            }
        });

        $resposta = $this->como($this->usuario($tenant), $tenant)->postJson("/api/escola/turmas/{$turma->id}/duplicar")
            ->assertCreated()->assertJsonPath('nome', '8º A (Cópia)');

        $this->assertCount(7, $resposta->json('materias'));
        $this->assertSame(0, $this->noTenant($tenant, fn () => \Modules\Escola\Models\Aluno::where('turma_id', $resposta->json('id'))->count()));
    }
}

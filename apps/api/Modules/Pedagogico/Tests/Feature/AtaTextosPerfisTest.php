<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Pedagogico\Tests\Concerns\CenarioPedagogico;
use Modules\Pedagogico\Tests\TestCase;

/** Fase 2 — tarefas 1.1 e 1.2: textos/assinaturas da ata, responsável da ocorrência e escola.view nos perfis. */
final class AtaTextosPerfisTest extends TestCase
{
    use CenarioPedagogico;
    use RefreshDatabase;

    private const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    public function test_rascunho_guarda_textos_e_assinaturas_e_bloqueia_apos_finalizar(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $direcao = $this->usuario($tenant);

        $id = $this->como($direcao, $tenant)->postJson('/api/pedagogico/atas', [
            'turma_id' => $turma->id, 'ano_letivo' => 2026, 'periodo' => 1, 'data_reuniao' => '2026-04-30',
            'texto_introducao' => 'Aos trinta dias…', 'texto_conclusao' => 'Nada mais havendo…',
            'assinaturas' => ['diretor' => self::PNG, 'pedagoga' => self::PNG],
        ])->assertCreated()->json('id');

        $this->como($direcao, $tenant)->getJson("/api/pedagogico/atas/{$id}")->assertOk()
            ->assertJsonPath('texto_introducao', 'Aos trinta dias…')
            ->assertJsonPath('assinaturas.pedagoga', self::PNG);

        $this->como($direcao, $tenant)->putJson("/api/pedagogico/atas/{$id}", ['assinaturas' => ['diretor' => 'data:image/jpeg;base64,AAAA']])
            ->assertStatus(422)->assertJsonValidationErrors('assinaturas.diretor');

        $this->como($direcao, $tenant)->postJson("/api/pedagogico/atas/{$id}/finalizar")->assertOk();
        $this->como($direcao, $tenant)->putJson("/api/pedagogico/atas/{$id}", ['texto_conclusao' => 'Alterado'])->assertStatus(422);
    }

    public function test_ocorrencia_guarda_responsavel(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->aluno($tenant, $this->turma($tenant), 'Aluno');

        $this->como($this->usuario($tenant), $tenant)->postJson('/api/pedagogico/ocorrencias', [
            'aluno_id' => $aluno->id, 'categoria_id' => $this->categoria($tenant)->id, 'data' => '2026-03-10',
            'descricao' => 'x', 'severidade' => 'media', 'responsavel' => 'Pedagogia — Manhã',
        ])->assertCreated()->assertJsonPath('responsavel', 'Pedagogia — Manhã');
    }

    public function test_professor_le_o_cadastro_escolar_mas_nao_escreve(): void
    {
        $tenant = $this->criarTenant();
        $this->materia($tenant, 'Arte');
        $professor = $this->usuario($tenant, ['pedagogico_professor']);

        $this->como($professor, $tenant)->getJson('/api/escola/materias')->assertOk()->assertJsonPath('0.nome', 'Arte');
        $this->como($professor, $tenant)->postJson('/api/escola/materias', ['nome' => 'Química'])->assertStatus(403);
    }
}

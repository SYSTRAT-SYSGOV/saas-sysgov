<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/** Tarefas 2.3, 2.4 e 2.5 — alunos, remanejamento e exclusões. */
final class AlunoTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    public function test_cadastro_com_contatos_e_nome_em_maiusculas(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);

        $this->como($this->usuario($tenant, ['escola_secretaria']), $tenant)->postJson('/api/escola/alunos', [
            'nome' => 'ana clarice teste',
            'turma_id' => $turma->id,
            'cgm' => '1019756498',
            'contatos' => [['telefone' => '(41)98834-7486', 'descricao' => 'Mãe']],
        ])->assertCreated()
            ->assertJsonPath('nome', 'ANA CLARICE TESTE')
            ->assertJsonPath('numero', 1)
            ->assertJsonPath('contatos.0.descricao', 'Mãe');
    }

    public function test_cgm_repetido_no_mesmo_tenant_e_rejeitado(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $this->aluno($tenant, $turma, 'Primeiro', ['cgm' => '123']);

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/escola/alunos', ['nome' => 'Segundo', 'turma_id' => $turma->id, 'cgm' => '123'])
            ->assertStatus(422)->assertJsonValidationErrors('cgm');
    }

    public function test_busca_pelo_nome_da_mae_e_filtro_por_turma(): void
    {
        $tenant = $this->criarTenant();
        $turmaA = $this->turma($tenant, '6º A');
        $turmaB = $this->turma($tenant, '7º B');
        $this->aluno($tenant, $turmaA, 'Joao', ['mae' => 'Maria Souza']);
        $this->aluno($tenant, $turmaB, 'Pedro', ['mae' => 'Joana']);
        $direcao = $this->usuario($tenant);

        $this->como($direcao, $tenant)->getJson('/api/escola/alunos?busca=maria')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nome', 'JOAO');
        $this->como($direcao, $tenant)->getJson("/api/escola/alunos?turma_id={$turmaB->id}")
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nome', 'PEDRO');
    }

    public function test_remanejar_para_a_mesma_turma_e_rejeitado(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $aluno = $this->aluno($tenant, $turma, 'Aluno');

        $this->como($this->usuario($tenant), $tenant)
            ->putJson("/api/escola/alunos/{$aluno->id}", ['situacao' => 'remanejado', 'turma_id' => $turma->id])
            ->assertStatus(422)->assertJsonValidationErrors('turma_id');
    }

    public function test_remanejamento_recebe_proximo_numero_e_guarda_origem(): void
    {
        $tenant = $this->criarTenant();
        $origem = $this->turma($tenant, '6º A');
        $destino = $this->turma($tenant, '6º B');
        $this->aluno($tenant, $destino, 'Ocupa 32', ['numero' => 32]);
        $aluno = $this->aluno($tenant, $origem, 'Remanejado');

        $this->como($this->usuario($tenant), $tenant)
            ->putJson("/api/escola/alunos/{$aluno->id}", ['situacao' => 'remanejado', 'turma_id' => $destino->id])
            ->assertOk()
            ->assertJsonPath('numero', 33)
            ->assertJsonPath('turma.id', $destino->id)
            ->assertJsonPath('turma_origem.id', $origem->id);
    }

    public function test_limpar_turma_exige_confirmacao(): void
    {
        $tenant = $this->criarTenant();
        $turma = $this->turma($tenant);
        $this->aluno($tenant, $turma, 'Um');
        $this->aluno($tenant, $turma, 'Dois');
        $direcao = $this->usuario($tenant);

        $this->como($direcao, $tenant)->postJson("/api/escola/turmas/{$turma->id}/limpar", ['confirmacao' => 'excluir'])->assertStatus(422);
        $this->assertSame(2, $this->noTenant($tenant, fn () => Aluno::count()));

        $this->como($direcao, $tenant)->postJson("/api/escola/turmas/{$turma->id}/limpar", ['confirmacao' => 'EXCLUIR'])
            ->assertOk()->assertJsonPath('excluidos', 2);
        $this->assertSame(0, $this->noTenant($tenant, fn () => Aluno::count()));
        $this->assertSame(2, $this->noTenant($tenant, fn () => Aluno::onlyTrashed()->count()));
    }

    public function test_excluir_varios_nao_aceita_aluno_de_outro_tenant(): void
    {
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');
        $alunoA = $this->aluno($tenantA, $this->turma($tenantA), 'Do A');
        $alunoB = $this->aluno($tenantB, $this->turma($tenantB), 'Do B');

        $this->como($this->usuario($tenantA), $tenantA)
            ->postJson('/api/escola/alunos/excluir', ['ids' => [$alunoA->id, $alunoB->id]])
            ->assertStatus(422);

        $this->como($this->usuario($tenantA), $tenantA)
            ->postJson('/api/escola/alunos/excluir', ['ids' => [$alunoA->id]])
            ->assertOk()->assertJsonPath('excluidos', 1);
        $this->assertSame(1, $this->noTenant($tenantB, fn () => Aluno::count()));
    }
}

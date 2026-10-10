<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Formatura\Tests\Concerns\CenarioFormatura;
use Modules\Formatura\Tests\TestCase;

/** Tarefa 5.2 — participação em lote (D11). */
final class ParticipacaoEmLoteTest extends TestCase
{
    use CenarioFormatura;
    use RefreshDatabase;

    public function test_marca_e_desmarca_a_turma_inteira_sem_mexer_nas_outras(): void
    {
        $tenant = $this->criarTenant();
        $a = $this->turma($tenant, '3º A');
        $b = $this->turma($tenant, '3º B');
        $this->configurar($tenant, ['turmas_ids' => [$a->id, $b->id]]);
        $this->alunoNaTurma($tenant, 'Ana', '3º A');
        $this->alunoNaTurma($tenant, 'Bruno', '3º A');
        $this->alunoNaTurma($tenant, 'Carla', '3º B');
        $comissao = $this->usuario($tenant);

        $this->como($comissao, $tenant)->putJson('/api/formatura/formandos/participacao-em-lote', ['ano_letivo' => 2026, 'turma_id' => $a->id, 'participa' => true])
            ->assertOk()->assertJsonCount(2)->assertJsonPath('0.participa', true)->assertJsonPath('1.participa', true);

        /** @var list<array<string, mixed>> $json */
        $json = $this->como($comissao, $tenant)->getJson('/api/formatura/formandos?ano_letivo=2026')->json();
        $lista = collect($json)->keyBy('nome');
        $this->assertFalse($lista['CARLA']['participa']);
        $this->assertSame(2, AuditLog::query()->where('module', 'formatura')->where('action', 'participacao.criada')->count());

        $this->como($comissao, $tenant)->putJson('/api/formatura/formandos/participacao-em-lote', ['ano_letivo' => 2026, 'turma_id' => $a->id, 'participa' => false])
            ->assertOk()->assertJsonPath('0.participa', false)->assertJsonPath('1.participa', false);
    }

    public function test_marcar_todos_ignora_transferido_e_inclui_remanejado(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $this->alunoNaTurma($tenant, 'Ativo');
        $transferido = $this->alunoNaTurma($tenant, 'Transferido');
        $remanejado = $this->alunoNaTurma($tenant, 'Remanejado');
        $this->noTenant($tenant, fn () => Aluno::whereKey($transferido->id)->update(['situacao' => 'transferido']));
        $this->noTenant($tenant, fn () => Aluno::whereKey($remanejado->id)->update(['situacao' => 'remanejado', 'turma_origem_id' => $this->turma($tenant, '3º B')->id]));

        $resposta = $this->como($this->usuario($tenant), $tenant)->putJson('/api/formatura/formandos/participacao-em-lote', [
            'ano_letivo' => 2026, 'turma_id' => $this->turma($tenant)->id, 'participa' => true,
        ])->assertOk();
        /** @var list<array<string, mixed>> $json */
        $json = $resposta->json();
        $lista = collect($json)->keyBy('nome');
        $this->assertTrue($lista['ATIVO']['participa']);
        $this->assertTrue($lista['REMANEJADO']['participa']);
        $this->assertFalse($lista['TRANSFERIDO']['participa']);
        $this->assertSame('transferido', $lista['TRANSFERIDO']['situacao_aluno']);
    }

    public function test_turma_nao_formanda_e_tesouraria_sao_rejeitadas(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $calouros = $this->turma($tenant, '1º A');

        $this->como($this->usuario($tenant), $tenant)->putJson('/api/formatura/formandos/participacao-em-lote', ['ano_letivo' => 2026, 'turma_id' => $calouros->id, 'participa' => true])
            ->assertStatus(422)->assertJsonValidationErrors('turma_id');
        $this->como($this->usuario($tenant, ['formatura_tesouraria']), $tenant)->putJson('/api/formatura/formandos/participacao-em-lote', ['ano_letivo' => 2026, 'turma_id' => $this->turma($tenant)->id, 'participa' => true])
            ->assertStatus(403);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/** Tarefas 2.8 e 2.9 — trimestres, categorias e auditoria/outbox. */
final class CalendarioAuditoriaTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_trimestre_repetido_e_rejeitado_e_situacao_e_calculada(): void
    {
        Carbon::setTestNow('2026-09-27 10:00:00');
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $dados = ['ano_letivo' => 2026, 'numero' => 3, 'data_inicio' => '2026-09-08', 'data_fim' => '2026-12-18'];

        $this->como($direcao, $tenant)->postJson('/api/escola/trimestres', $dados)->assertCreated()->assertJsonPath('situacao', 'em_andamento');
        $this->como($direcao, $tenant)->postJson('/api/escola/trimestres', $dados)->assertStatus(422)->assertJsonValidationErrors('numero');
        $this->como($direcao, $tenant)->postJson('/api/escola/trimestres', ['ano_letivo' => 2026, 'numero' => 1, 'data_inicio' => '2026-02-05', 'data_fim' => '2026-05-14'])
            ->assertJsonPath('situacao', 'encerrado');
        $this->como($direcao, $tenant)->postJson('/api/escola/trimestres', ['ano_letivo' => 2025, 'numero' => 1, 'data_inicio' => '2025-02-05', 'data_fim' => '2025-05-14'])
            ->assertJsonPath('situacao', 'arquivo');
    }

    public function test_fim_antes_do_inicio_e_rejeitado(): void
    {
        $tenant = $this->criarTenant();

        $this->como($this->usuario($tenant), $tenant)
            ->postJson('/api/escola/trimestres', ['ano_letivo' => 2026, 'numero' => 1, 'data_inicio' => '2026-05-10', 'data_fim' => '2026-05-01'])
            ->assertStatus(422)->assertJsonValidationErrors('data_fim');
    }

    public function test_categorias_padrao_e_cor_invalida(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);

        $this->como($direcao, $tenant)->getJson('/api/escola/categorias')->assertOk()->assertJsonCount(8)->assertJsonPath('0.nome', 'Elogio / Destaque');
        $this->como($direcao, $tenant)->postJson('/api/escola/categorias', ['nome' => 'Atraso', 'cor' => 'laranja'])
            ->assertStatus(422)->assertJsonValidationErrors('cor');
        $this->como($direcao, $tenant)->postJson('/api/escola/categorias', ['nome' => 'Atraso', 'cor' => '#FF8800'])
            ->assertCreated()->assertJsonPath('cor', '#ff8800');
    }

    public function test_categoria_excluida_nao_volta_como_padrao(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $id = $this->como($direcao, $tenant)->getJson('/api/escola/categorias')->json('0.id');

        $this->como($direcao, $tenant)->deleteJson("/api/escola/categorias/{$id}")->assertOk();
        $this->como($direcao, $tenant)->getJson('/api/escola/categorias')->assertJsonCount(7);
    }

    public function test_alterar_turma_do_aluno_gera_auditoria_e_evento(): void
    {
        $tenant = $this->criarTenant();
        $turmaA = $this->turma($tenant, '6º A');
        $turmaB = $this->turma($tenant, '6º B');
        $aluno = $this->aluno($tenant, $turmaA, 'Auditado');

        $this->como($this->usuario($tenant), $tenant)->putJson("/api/escola/alunos/{$aluno->id}", ['turma_id' => $turmaB->id])->assertOk();

        $log = AuditLog::query()->where('module', 'escola')->where('action', 'aluno.atualizado')->latest('id')->firstOrFail();
        $this->assertSame("aluno:{$aluno->id}", $log->resource);
        $this->assertSame($turmaA->id, $log->before['turma_id']);
        $this->assertSame($turmaB->id, $log->after['turma_id']);
        $this->assertSame($tenant->id, $log->tenant_id);
        $this->assertTrue(OutboxEvent::query()->where('event_type', 'escola.aluno.atualizado')->where('tenant_id', $tenant->id)->exists());
    }
}

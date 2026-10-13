<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/** Tarefa 5B.4 — equipe gestora cadastrada por nome (D17). */
final class EquipeTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    public function test_cadastra_diretor_auxiliares_secretaria_e_pedagoga(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);

        foreach ([['Maria Diretora', 'diretor'], ['Paulo Auxiliar', 'diretor_auxiliar'], ['Rita Auxiliar', 'diretor_auxiliar'], ['João Secretário', 'secretaria'], ['Ana Pedagoga', 'pedagoga']] as [$nome, $cargo]) {
            $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => $nome, 'cargo' => $cargo])->assertCreated()->assertJsonPath('cargo', $cargo);
        }

        $this->como($direcao, $tenant)->getJson('/api/escola/equipe')->assertOk()->assertJsonCount(5)
            ->assertJsonPath('0.nome', 'Maria Diretora');
        $this->assertTrue(AuditLog::query()->where('module', 'escola')->where('action', 'equipe.criada')->exists());
    }

    public function test_um_so_diretor_e_cargo_valido(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => 'Maria', 'cargo' => 'diretor'])->assertCreated();

        $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => 'Outro', 'cargo' => 'diretor'])
            ->assertStatus(422)->assertJsonValidationErrors('cargo');
        $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => 'X', 'cargo' => 'zelador'])
            ->assertStatus(422)->assertJsonValidationErrors('cargo');
    }

    public function test_edita_exclui_e_so_quem_gerencia_estrutura_escreve(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $id = $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => 'Ana', 'cargo' => 'pedagoga'])->json('id');

        $this->como($direcao, $tenant)->putJson("/api/escola/equipe/{$id}", ['nome' => 'Ana Paula'])->assertOk()->assertJsonPath('nome', 'Ana Paula');
        $secretaria = $this->usuario($tenant, ['escola_secretaria']);
        $this->como($secretaria, $tenant)->getJson('/api/escola/equipe')->assertOk()->assertJsonCount(1);
        $this->como($secretaria, $tenant)->postJson('/api/escola/equipe', ['nome' => 'X', 'cargo' => 'pedagoga'])->assertStatus(403);
        $this->como($direcao, $tenant)->deleteJson("/api/escola/equipe/{$id}")->assertOk();
        $this->como($direcao, $tenant)->getJson('/api/escola/equipe')->assertJsonCount(0);
    }

    public function test_equipe_de_outro_tenant_nao_aparece_nem_e_editavel(): void
    {
        $a = $this->criarTenant('escola-a');
        $b = $this->criarTenant('escola-b');
        $id = $this->como($this->usuario($b), $b)->postJson('/api/escola/equipe', ['nome' => 'De B', 'cargo' => 'diretor'])->json('id');
        $direcaoA = $this->usuario($a);

        $this->como($direcaoA, $a)->getJson('/api/escola/equipe')->assertOk()->assertJsonCount(0);
        $this->como($direcaoA, $a)->putJson("/api/escola/equipe/{$id}", ['nome' => 'Invadido'])->assertNotFound();
        $this->como($direcaoA, $a)->postJson('/api/escola/equipe', ['nome' => 'Diretor A', 'cargo' => 'diretor'])->assertCreated();
    }

    public function test_turma_recebe_pedagoga_cadastrada_e_perde_ao_excluir_ou_mudar_cargo(): void
    {
        $tenant = $this->criarTenant();
        $direcao = $this->usuario($tenant);
        $turma = $this->turma($tenant);
        $ana = $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => 'Ana', 'cargo' => 'pedagoga'])->json('id');
        $bia = $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => 'Bia', 'cargo' => 'pedagoga'])->json('id');
        $secretario = $this->como($direcao, $tenant)->postJson('/api/escola/equipe', ['nome' => 'João', 'cargo' => 'secretaria'])->json('id');

        $this->como($direcao, $tenant)->putJson("/api/escola/turmas/{$turma->id}", ['pedagoga_id' => $secretario])
            ->assertStatus(422)->assertJsonValidationErrors('pedagoga_id');
        $this->como($direcao, $tenant)->putJson("/api/escola/turmas/{$turma->id}", ['pedagoga_id' => $ana])
            ->assertOk()->assertJsonPath('pedagoga.nome', 'Ana');
        $this->como($direcao, $tenant)->getJson('/api/escola/turmas')->assertJsonPath('0.pedagoga.id', $ana);

        $this->como($direcao, $tenant)->deleteJson("/api/escola/equipe/{$ana}")->assertOk();
        $this->como($direcao, $tenant)->getJson("/api/escola/turmas/{$turma->id}")->assertJsonPath('pedagoga', null);

        $this->como($direcao, $tenant)->putJson("/api/escola/turmas/{$turma->id}", ['pedagoga_id' => $bia])->assertOk();
        $this->como($direcao, $tenant)->putJson("/api/escola/equipe/{$bia}", ['cargo' => 'secretaria'])->assertOk();
        $this->como($direcao, $tenant)->getJson("/api/escola/turmas/{$turma->id}")->assertJsonPath('pedagoga', null);

        $this->como($direcao, $tenant)->putJson("/api/escola/turmas/{$turma->id}", ['pedagoga_id' => null])->assertOk()->assertJsonPath('pedagoga', null);
    }

    public function test_pedagoga_de_outro_tenant_nao_e_aceita_na_turma(): void
    {
        $a = $this->criarTenant('escola-a');
        $b = $this->criarTenant('escola-b');
        $deB = $this->como($this->usuario($b), $b)->postJson('/api/escola/equipe', ['nome' => 'De B', 'cargo' => 'pedagoga'])->json('id');
        $turma = $this->turma($a);

        $this->como($this->usuario($a), $a)->putJson("/api/escola/turmas/{$turma->id}", ['pedagoga_id' => $deB])
            ->assertStatus(422)->assertJsonValidationErrors('pedagoga_id');
    }
}

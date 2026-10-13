<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Modules\Formatura\Models\Pagamento;
use Modules\Formatura\Tests\Concerns\CenarioFormatura;
use Modules\Formatura\Tests\TestCase;

/** Tarefa 5.1 — turmas formandas (D10). */
final class TurmasFormandasTest extends TestCase
{
    use CenarioFormatura;
    use RefreshDatabase;

    public function test_turma_de_outro_ano_ou_de_outro_tenant_e_rejeitada(): void
    {
        $tenant = $this->criarTenant();
        $outro = $this->criarTenant('escola-b');
        $de2025 = $this->turma($tenant, '3º A', 2025);
        $alheia = $this->turma($outro, '3º Z');

        $this->configurarCom($tenant, [$de2025->id])->assertStatus(422)->assertJsonValidationErrors('turmas_ids');
        $this->configurarCom($tenant, [$alheia->id])->assertStatus(422)->assertJsonValidationErrors('turmas_ids.0');
    }

    public function test_so_alunos_das_turmas_formandas_sao_formandos(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $this->alunoNaTurma($tenant, 'Concluinte', '3º A');
        $this->alunoNaTurma($tenant, 'Calouro', '1º A');

        $this->como($this->usuario($tenant), $tenant)->getJson('/api/formatura/formandos?ano_letivo=2026')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.nome', 'CONCLUINTE');
    }

    public function test_sem_turmas_formandas_nao_ha_formandos(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant, ['turmas_ids' => []]);
        $this->alunoNaTurma($tenant, 'Concluinte');

        $this->como($this->usuario($tenant), $tenant)->getJson('/api/formatura/formandos?ano_letivo=2026')->assertOk()->assertJsonCount(0);
    }

    public function test_aluno_fora_das_turmas_formandas_e_rejeitado(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $calouro = $this->alunoNaTurma($tenant, 'Calouro', '1º A');
        $comissao = $this->usuario($tenant);

        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$calouro->id}", ['ano_letivo' => 2026, 'participa' => true])
            ->assertStatus(422)->assertJsonValidationErrors('aluno_id');
        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', [
            'ano_letivo' => 2026, 'aluno_id' => $calouro->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10',
            'valor_centavos' => 5000, 'forma_pagamento' => 'dinheiro',
        ])->assertStatus(422)->assertJsonValidationErrors('aluno_id');
    }

    public function test_transferido_nao_entra_nem_paga_mas_pode_ser_retirado(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Saiu');
        $comissao = $this->usuario($tenant);
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true])->assertOk();
        $this->noTenant($tenant, fn () => \Modules\Escola\Models\Aluno::whereKey($aluno->id)->update(['situacao' => 'transferido']));

        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', [
            'ano_letivo' => 2026, 'aluno_id' => $aluno->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10',
            'valor_centavos' => 5000, 'forma_pagamento' => 'dinheiro',
        ])->assertStatus(422)->assertJsonValidationErrors('aluno_id');
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => false])->assertOk();
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true])
            ->assertStatus(422)->assertJsonValidationErrors('aluno_id');
    }

    public function test_turma_desmarcada_sai_das_listas_e_do_relatorio_mas_pagamentos_ficam(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Concluinte');
        $comissao = $this->usuario($tenant);
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true])->assertOk();
        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', [
            'ano_letivo' => 2026, 'aluno_id' => $aluno->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10',
            'valor_centavos' => 5000, 'forma_pagamento' => 'dinheiro',
        ])->assertCreated();

        $this->configurar($tenant, ['turmas_ids' => [$this->turma($tenant, '3º B')->id]]);

        $this->como($comissao, $tenant)->getJson('/api/formatura/formandos?ano_letivo=2026')->assertJsonCount(0);
        $this->como($comissao, $tenant)->getJson('/api/formatura/relatorio?ano_letivo=2026')
            ->assertJsonPath('resumo.valor_total_recebido_centavos', 0)
            ->assertJsonCount(0, 'formas_pagamento');
        $this->noTenant($tenant, fn () => $this->assertSame(1, Pagamento::count()));
    }

    public function test_ano_sem_configuracao_responde_null(): void
    {
        $tenant = $this->criarTenant();

        $resposta = $this->como($this->usuario($tenant), $tenant)->getJson('/api/formatura/configuracao?ano_letivo=2030')->assertOk();
        $this->assertSame('null', $resposta->getContent());
    }

    /**
     * @param list<int> $turmas
     * @return TestResponse<\Symfony\Component\HttpFoundation\Response>
     */
    private function configurarCom(Tenant $tenant, array $turmas): TestResponse
    {
        return $this->como($this->usuario($tenant), $tenant)->putJson('/api/formatura/configuracao', [
            'ano_letivo' => 2026, 'titulo' => 'Formatura 2026', 'tipo_calculo' => 'por_pessoa', 'valor_base_centavos' => 15000,
            'max_parcelas' => 12, 'formas_pagamento' => ['pix'], 'turmas_ids' => $turmas,
        ]);
    }
}

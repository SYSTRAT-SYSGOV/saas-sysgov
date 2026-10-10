<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Formatura\Tests\Concerns\CenarioFormatura;
use Modules\Formatura\Tests\TestCase;

/** Tarefa 5.3 — listagem de pagamentos (D12) e relatório por período (D13). */
final class PagamentosPeriodoTest extends TestCase
{
    use CenarioFormatura;
    use RefreshDatabase;

    public function test_lista_pagamentos_do_periodo_com_nome_e_turma_sem_estornados(): void
    {
        [$tenant, $comissao, $aluno] = $this->cenario();
        $this->pagar($comissao, $tenant, $aluno, '2026-06-10', 20000);
        $julho = $this->pagar($comissao, $tenant, $aluno, '2026-07-10', 10000);
        $estornado = $this->pagar($comissao, $tenant, $aluno, '2026-07-15', 999);
        $this->como($comissao, $tenant)->deleteJson("/api/formatura/pagamentos/{$estornado}")->assertOk();

        $this->como($comissao, $tenant)->getJson('/api/formatura/pagamentos?ano_letivo=2026&data_inicio=2026-07-01&data_fim=2026-07-31')
            ->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.id', $julho)
            ->assertJsonPath('0.aluno_nome', 'FORMANDA')
            ->assertJsonPath('0.turma', '3º A')
            ->assertJsonPath('0.data_pagamento', '2026-07-10');
        $this->como($comissao, $tenant)->getJson('/api/formatura/pagamentos?ano_letivo=2026')->assertJsonCount(2);
    }

    public function test_periodo_invertido_e_rejeitado(): void
    {
        [$tenant, $comissao] = $this->cenario();

        $this->como($comissao, $tenant)->getJson('/api/formatura/pagamentos?ano_letivo=2026&data_inicio=2026-07-31&data_fim=2026-07-01')
            ->assertStatus(422)->assertJsonValidationErrors('data_fim');
        $this->como($comissao, $tenant)->getJson('/api/formatura/relatorio?ano_letivo=2026&data_inicio=2026-07-31&data_fim=2026-07-01')
            ->assertStatus(422)->assertJsonValidationErrors('data_fim');
    }

    public function test_periodo_nao_altera_a_situacao_no_relatorio(): void
    {
        [$tenant, $comissao, $aluno] = $this->cenario();
        $this->pagar($comissao, $tenant, $aluno, '2026-06-10', 60000);

        $this->como($comissao, $tenant)->getJson('/api/formatura/relatorio?ano_letivo=2026&data_inicio=2026-07-01&data_fim=2026-07-31')
            ->assertOk()
            ->assertJsonPath('resumo.recebido_periodo_centavos', 0)
            ->assertJsonPath('resumo.valor_total_recebido_centavos', 60000)
            ->assertJsonPath('resumo.qtd_quitados', 1)
            ->assertJsonCount(0, 'formas_pagamento');
        $this->como($comissao, $tenant)->getJson('/api/formatura/relatorio?ano_letivo=2026')
            ->assertJsonMissingPath('resumo.recebido_periodo_centavos')
            ->assertJsonPath('formas_pagamento.0.total_centavos', 60000);
    }

    public function test_listagem_nao_mostra_pagamentos_de_outro_tenant(): void
    {
        [$tenantA, $comissaoA] = $this->cenario();
        [$tenantB, $comissaoB, $alunoB] = $this->cenario('escola-b');
        $this->pagar($comissaoB, $tenantB, $alunoB, '2026-06-10', 5000);

        $this->como($comissaoA, $tenantA)->getJson('/api/formatura/pagamentos?ano_letivo=2026')->assertOk()->assertJsonCount(0);
    }

    public function test_pagante_desmarcado_sai_do_recebido_em_todas_as_bases(): void
    {
        [$tenant, $comissao, $aluno] = $this->cenario();
        $this->pagar($comissao, $tenant, $aluno, '2026-07-10', 50000);
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => false])->assertOk();

        $this->como($comissao, $tenant)->getJson('/api/formatura/relatorio?ano_letivo=2026&data_inicio=2026-07-01&data_fim=2026-07-31')
            ->assertOk()
            ->assertJsonPath('resumo.valor_total_recebido_centavos', 0)
            ->assertJsonPath('resumo.recebido_periodo_centavos', 0)
            ->assertJsonCount(0, 'formas_pagamento');
        $this->como($comissao, $tenant)->getJson('/api/formatura/pagamentos?ano_letivo=2026')
            ->assertOk()->assertJsonCount(1)->assertJsonPath('0.participa', false);
    }

    /** @return array{0: Tenant, 1: User, 2: Aluno} */
    private function cenario(string $slug = 'escola-a'): array
    {
        $tenant = $this->criarTenant($slug);
        $this->configurar($tenant, ['formas_pagamento' => ['pix', 'dinheiro']]);
        $aluno = $this->alunoNaTurma($tenant, 'Formanda');
        $comissao = $this->usuario($tenant);
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'convidados_incluidos' => 3])->assertOk();

        return [$tenant, $comissao, $aluno];
    }

    private function pagar(User $user, Tenant $tenant, Aluno $aluno, string $data, int $valor): int
    {
        return (int) $this->como($user, $tenant)->postJson('/api/formatura/pagamentos', [
            'ano_letivo' => 2026, 'aluno_id' => $aluno->id, 'numero_parcela' => 1, 'data_pagamento' => $data,
            'valor_centavos' => $valor, 'forma_pagamento' => 'dinheiro',
        ])->assertCreated()->json('id');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Feature;

use App\Models\AuditLog;
use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Modules\Formatura\Models\Configuracao;
use Modules\Formatura\Models\Pagamento;
use Modules\Formatura\Models\Participacao;
use Modules\Formatura\Tests\Concerns\CenarioFormatura;
use Modules\Formatura\Tests\TestCase;

/** Tarefas 4.1, 4.2, 4.4, 4.5 e 4.6. */
final class FormaturaTest extends TestCase
{
    use CenarioFormatura;
    use RefreshDatabase;

    public function test_estrutura_dependencia_e_colunas_em_centavos(): void
    {
        $json = json_decode((string) file_get_contents(base_path('Modules/Formatura/module.json')), true);
        $this->assertContains('Escola', $json['requires']);
        foreach (['formatura_configuracoes' => 'valor_base_centavos', 'formatura_pagamentos' => 'valor_centavos'] as $tabela => $coluna) {
            $this->assertSame('integer', Schema::getColumnType($tabela, $coluna), "{$tabela}.{$coluna} deve ser inteiro");
            foreach (Schema::getIndexes($tabela) as $indice) {
                if (!$indice['primary']) {
                    $this->assertSame('tenant_id', $indice['columns'][0]);
                }
            }
        }
    }

    public function test_tesouraria_nao_altera_valores_e_valor_fracionado_e_rejeitado(): void
    {
        $tenant = $this->criarTenant();
        $this->como($this->usuario($tenant, ['formatura_tesouraria']), $tenant)->putJson('/api/formatura/configuracao', [
            'ano_letivo' => 2026, 'titulo' => 'x', 'tipo_calculo' => 'por_pessoa', 'valor_base_centavos' => 100, 'max_parcelas' => 1, 'formas_pagamento' => ['pix'],
        ])->assertStatus(403);

        $this->como($this->usuario($tenant), $tenant)->putJson('/api/formatura/configuracao', [
            'ano_letivo' => 2026, 'titulo' => 'x', 'tipo_calculo' => 'por_pessoa', 'valor_base_centavos' => 150.5, 'max_parcelas' => 30, 'formas_pagamento' => ['pix'],
        ])->assertStatus(422)->assertJsonValidationErrors(['valor_base_centavos', 'max_parcelas']);
    }

    public function test_pagamento_valida_parcela_forma_e_participacao(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant, ['max_parcelas' => 3]);
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $comissao = $this->usuario($tenant);
        $pagamento = fn (array $extra): array => ['ano_letivo' => 2026, 'aluno_id' => $aluno->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10', 'valor_centavos' => 10000, 'forma_pagamento' => 'dinheiro', ...$extra];

        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', $pagamento([]))
            ->assertStatus(422)->assertJsonPath('error', 'O aluno não está participando da formatura deste ano.');

        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'convidados' => 3])->assertOk();

        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', $pagamento(['forma_pagamento' => 'boleto']))
            ->assertStatus(422)->assertJsonValidationErrors('forma_pagamento');
        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', $pagamento(['numero_parcela' => 4]))
            ->assertStatus(422)->assertJsonValidationErrors('numero_parcela');
        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', $pagamento(['forma_pagamento' => 'pix']))
            ->assertStatus(422)->assertJsonValidationErrors('chave_pix');
        $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', $pagamento([]))->assertCreated();
    }

    public function test_situacao_parcial_relatorio_e_auditoria(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $comissao = $this->usuario($tenant);
        $a = $this->alunoNaTurma($tenant, 'Parcial');
        $b = $this->alunoNaTurma($tenant, 'Quitado');
        $this->alunoNaTurma($tenant, 'Nao Participa');
        foreach ([$a, $b] as $aluno) {
            $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true, 'convidados' => 3])->assertOk()
                ->assertJsonPath('valor_devido_centavos', 60000);
        }
        $pagar = fn ($aluno, int $valor, string $forma) => $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', [
            'ano_letivo' => 2026, 'aluno_id' => $aluno->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10',
            'valor_centavos' => $valor, 'forma_pagamento' => $forma, 'chave_pix' => $forma === 'pix' ? 'escola@pix.gov.br' : null,
        ])->assertCreated();
        $pagar($a, 20000, 'pix');
        $pagar($b, 10000, 'dinheiro');
        $pagar($b, 50000, 'pix');

        /** @var list<array<string, mixed>> $lista */
        $lista = $this->como($comissao, $tenant)->getJson('/api/formatura/formandos?ano_letivo=2026')->assertOk()->json();
        $formandos = collect($lista)->keyBy('nome');
        $this->assertSame('parcial', $formandos['PARCIAL']['situacao']);
        $this->assertSame(40000, $formandos['PARCIAL']['saldo_devedor_centavos']);
        $this->assertSame('quitado', $formandos['QUITADO']['situacao']);
        $this->assertSame(0, $formandos['NAO PARTICIPA']['valor_devido_centavos']);

        $relatorio = $this->como($comissao, $tenant)->getJson('/api/formatura/relatorio?ano_letivo=2026')->assertOk();
        $relatorio->assertJsonPath('resumo.valor_total_recebido_centavos', 80000)
            ->assertJsonPath('resumo.valor_total_receber_centavos', 120000)
            ->assertJsonPath('resumo.total_formandos', 2)
            ->assertJsonPath('resumo.qtd_quitados', 1)
            ->assertJsonPath('resumo.qtd_parciais', 1);
        /** @var list<array<string, mixed>> $formas */
        $formas = $relatorio->json('formas_pagamento');
        $this->assertSame(80000, collect($formas)->sum('total_centavos'));

        $this->assertTrue(AuditLog::query()->where('module', 'formatura')->where('action', 'pagamento.registrado')->exists());
        $this->assertTrue(OutboxEvent::query()->where('event_type', 'formatura.pagamento.registrado')->where('tenant_id', $tenant->id)->exists());
    }

    public function test_estorno_e_logico_e_sai_dos_totais(): void
    {
        $tenant = $this->criarTenant();
        $this->configurar($tenant);
        $comissao = $this->usuario($tenant);
        $aluno = $this->alunoNaTurma($tenant, 'Estorno');
        $this->como($comissao, $tenant)->putJson("/api/formatura/formandos/{$aluno->id}", ['ano_letivo' => 2026, 'participa' => true])->assertOk();
        $id = $this->como($comissao, $tenant)->postJson('/api/formatura/pagamentos', ['ano_letivo' => 2026, 'aluno_id' => $aluno->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10', 'valor_centavos' => 5000, 'forma_pagamento' => 'dinheiro'])->json('id');

        $this->como($comissao, $tenant)->deleteJson("/api/formatura/pagamentos/{$id}")->assertOk();
        $this->assertSoftDeleted('formatura_pagamentos', ['id' => $id]);
        $this->como($comissao, $tenant)->getJson('/api/formatura/relatorio?ano_letivo=2026')->assertJsonPath('resumo.valor_total_recebido_centavos', 0);
    }

    public function test_tesouraria_le_alunos_do_cadastro_mas_nao_edita(): void
    {
        $tenant = $this->criarTenant();
        $aluno = $this->alunoNaTurma($tenant, 'Formando');
        $tesouraria = $this->usuario($tenant, ['formatura_tesouraria']);

        $this->como($tesouraria, $tenant)->getJson('/api/escola/alunos')->assertOk()->assertJsonPath('data.0.nome', 'FORMANDO');
        $this->como($tesouraria, $tenant)->putJson("/api/escola/alunos/{$aluno->id}", ['nome' => 'Outro'])->assertStatus(403);
    }

    public function test_isolamento_entre_tenants(): void
    {
        $tenantA = $this->criarTenant('escola-a');
        $tenantB = $this->criarTenant('escola-b');
        $this->configurar($tenantA);
        $this->configurar($tenantB);
        $alunoA = $this->alunoNaTurma($tenantA, 'Do A');
        $alunoB = $this->alunoNaTurma($tenantB, 'Do B');
        $comissaoA = $this->usuario($tenantA);

        $this->como($comissaoA, $tenantA)->putJson("/api/formatura/formandos/{$alunoB->id}", ['ano_letivo' => 2026, 'participa' => true])->assertNotFound();
        $this->como($comissaoA, $tenantA)->postJson('/api/formatura/pagamentos', ['ano_letivo' => 2026, 'aluno_id' => $alunoB->id, 'numero_parcela' => 1, 'data_pagamento' => '2026-03-10', 'valor_centavos' => 5000, 'forma_pagamento' => 'dinheiro'])
            ->assertStatus(422)->assertJsonValidationErrors('aluno_id');

        $this->como($comissaoA, $tenantA)->putJson("/api/formatura/formandos/{$alunoA->id}", ['ano_letivo' => 2026, 'participa' => true])->assertOk();
        foreach ([Configuracao::class, Participacao::class, Pagamento::class] as $model) {
            $this->noTenant($tenantB, fn () => $this->assertSame(0, $model::where('tenant_id', $tenantA->id)->count(), $model));
        }
        $this->noTenant($tenantB, fn () => $this->assertSame(0, Participacao::count()));
        $this->como($comissaoA, $tenantA)->getJson('/api/formatura/formandos?ano_letivo=2026')->assertJsonCount(1);
    }
}

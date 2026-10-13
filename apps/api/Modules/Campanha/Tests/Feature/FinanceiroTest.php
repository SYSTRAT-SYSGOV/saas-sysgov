<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Livro-caixa com os campos da prestação de contas (Fase 2B, grupo 3). */
final class FinanceiroTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private const RECEITA = ['tipo' => 'receita', 'categoria' => 'doacao_pessoa_fisica', 'valor_centavos' => 5000000, 'data' => '2026-09-01', 'forma_pagamento' => 'pix', 'origem_recurso' => 'pessoa_fisica', 'contraparte_nome' => 'João Doador', 'contraparte_documento' => '529.982.247-25', 'recibo_eleitoral' => 'RE-0001'];

    private const DESPESA = ['tipo' => 'despesa', 'categoria' => 'publicidade_grafica', 'valor_centavos' => 3245075, 'data' => '2026-09-05', 'forma_pagamento' => 'transferencia', 'contraparte_nome' => 'Gráfica Norte Ltda', 'contraparte_documento' => '11.222.333/0001-81', 'documento_fiscal_tipo' => 'nota_fiscal', 'documento_fiscal_numero' => 'NF 123', 'codigo_ibge' => 4113700];

    public function test_validacoes_por_tipo_e_documento(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $g = fn () => $this->como($this->usuario($tenant), $tenant, $campanha);

        $g()->postJson('/api/campanha/lancamentos', [...self::RECEITA, 'contraparte_documento' => '111.111.111-11'])->assertStatus(422)->assertJsonPath('error', 'CPF ou CNPJ inválido.');
        $g()->postJson('/api/campanha/lancamentos', [...self::RECEITA, 'origem_recurso' => null])->assertStatus(422)->assertJsonPath('error', 'Informe a origem do recurso da receita.');
        $g()->postJson('/api/campanha/lancamentos', [...self::RECEITA, 'categoria' => 'combustivel'])->assertStatus(422);
        $g()->postJson('/api/campanha/lancamentos', [...self::DESPESA, 'codigo_ibge' => 4209102])->assertStatus(422);
        $g()->postJson('/api/campanha/lancamentos', [...self::DESPESA, 'valor_centavos' => 10.5])->assertStatus(422);

        $despesa = $g()->postJson('/api/campanha/lancamentos', [...self::DESPESA, 'recibo_eleitoral' => 'não cabe'])->assertCreated()
            ->assertJsonPath('recibo_eleitoral', null)->assertJsonPath('contraparte_documento', '11222333000181')->json();
        // O banco guarda o documento criptografado.
        $this->assertStringNotContainsString('11222333000181', (string) DB::table('campanha_lancamentos')->where('id', $despesa['id'])->value('contraparte_documento'));
        $g()->getJson('/api/campanha/lancamentos?busca=11.222.333/0001-81')->assertJsonPath('total', 1);
    }

    public function test_saldo_em_centavos_filtros_e_encerrada_so_consulta(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $g = fn () => $this->como($this->usuario($tenant), $tenant, $campanha);
        $g()->postJson('/api/campanha/lancamentos', self::RECEITA)->assertCreated();
        $g()->postJson('/api/campanha/lancamentos', self::DESPESA)->assertCreated();

        $g()->getJson('/api/campanha/financeiro/resumo')->assertOk()
            ->assertJsonPath('receitas_centavos', 5000000)->assertJsonPath('despesas_centavos', 3245075)->assertJsonPath('saldo_centavos', 1754925)
            ->assertJsonPath('por_origem.0.rotulo', 'Pessoa física')
            ->assertJsonFragment(['municipio' => 'Londrina', 'despesas_centavos' => 3245075, 'receitas_centavos' => 0])
            ->assertJsonFragment(['municipio' => 'Campanha geral', 'receitas_centavos' => 5000000]);
        $g()->getJson('/api/campanha/financeiro/resumo?tipo=despesa')->assertJsonPath('receitas_centavos', 0)->assertJsonPath('saldo_centavos', -3245075);
        $g()->getJson('/api/campanha/lancamentos?codigo_ibge=0')->assertJsonPath('total', 1)->assertJsonPath('lancamentos.0.tipo', 'receita');
        $g()->getJson('/api/campanha/lancamentos?de=2026-09-02')->assertJsonPath('total', 1);

        $this->noTenant($tenant, fn () => Campanha::query()->whereKey($campanha->id)->update(['status' => 'encerrada']));
        $g()->getJson('/api/campanha/financeiro/resumo')->assertOk();
        $g()->postJson('/api/campanha/lancamentos', self::DESPESA)->assertStatus(422);
    }

    public function test_exportacao_para_a_prestacao_de_contas_auditada(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $financeiro = $this->usuario($tenant, ['campanha_financeiro']);
        $this->membro($campanha, $financeiro);
        $f = fn () => $this->como($financeiro, $tenant, $campanha);
        $f()->postJson('/api/campanha/lancamentos', self::RECEITA)->assertCreated();
        $f()->postJson('/api/campanha/lancamentos', self::DESPESA)->assertCreated();
        $f()->postJson('/api/campanha/lancamentos', [...self::DESPESA, 'data' => '2026-10-02'])->assertCreated();

        $csv = $f()->get('/api/campanha/financeiro/exportar?de=2026-09-01&ate=2026-09-30')->assertOk()->streamedContent();
        $this->assertStringContainsString('Data;Tipo;Categoria;"Origem do recurso"', $csv);
        $this->assertStringContainsString('01/09/2026;Receita;"Doação de pessoa física";"Pessoa física";"João Doador";529.982.247-25;RE-0001', $csv);
        $this->assertStringContainsString('05/09/2026;Despesa;"Publicidade e gráfica";;"Gráfica Norte Ltda";11.222.333/0001-81;;"Nota fiscal";"NF 123";Transferência;32450,75;Londrina', $csv);
        $this->assertStringNotContainsString('02/10/2026', $csv);

        $log = AuditLog::query()->where('action', 'lancamentos.exportados')->firstOrFail();
        $this->assertSame(2, $log->after['quantidade']);
        $this->assertSame($financeiro->id, $log->user_id);
        $this->assertStringNotContainsString('529982', (string) json_encode(AuditLog::query()->where('action', 'lancamento.criado')->get(['before', 'after'])));
    }
}

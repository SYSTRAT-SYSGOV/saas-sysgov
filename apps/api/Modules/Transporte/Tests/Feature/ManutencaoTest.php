<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Models\Fornecedor;
use Modules\Transporte\Models\OrdemServico;
use Modules\Transporte\Models\Veiculo;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class ManutencaoTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    /** @param array<string, mixed> $extra */
    private function criarFornecedor(Tenant $t, User $g, array $extra = []): int
    {
        $n = ++$this->sequencia;

        return $this->como($g, $t)->postJson('/api/transporte/fornecedores', [
            'cnpj' => $this->cnpj(500 + $n), 'razao_social' => "Oficina {$n} Ltda", 'ramos' => ['mecanica'], ...$extra,
        ])->assertCreated()->json('data.id');
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function dadosOrdem(int $veiculo, array $extra = []): array
    {
        return ['veiculo_id' => $veiculo, 'tipo' => 'corretiva', 'descricao' => 'Troca da embreagem', 'aberta_em' => now()->subDays(3)->toDateString(), ...$extra];
    }

    /** @return array{0: Tenant, 1: User, 2: int} */
    private function cenario(): array
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        return [$t, $g, $this->criarVeiculo($t, $g)];
    }

    // --- Fornecedores ---------------------------------------------------------------------------------------------

    public function test_cadastra_fornecedor_sobre_a_pessoa_juridica_com_ramos(): void
    {
        [$t, $g] = $this->cenario();

        $r = $this->como($g, $t)->postJson('/api/transporte/fornecedores', [
            'cnpj' => $this->cnpj(900), 'razao_social' => 'Auto Peças Rio Claro Ltda', 'ramos' => ['mecanica', 'pecas', 'pecas'], 'contato' => '(41) 3333-0000',
        ])->assertCreated();

        $r->assertJsonPath('data.nome', 'Auto Peças Rio Claro Ltda')->assertJsonPath('data.ramos', ['mecanica', 'pecas'])->assertJsonPath('data.ramos_rotulos', ['Mecânica', 'Peças']);
        $this->assertNotNull($r->json('data.cnpj_mascarado'));
        $this->como($g, $t)->getJson('/api/transporte/fornecedores')->assertJsonCount(1, 'data');
    }

    public function test_fornecedor_exige_ramo_valido_e_nao_se_repete(): void
    {
        [$t, $g] = $this->cenario();
        $dados = ['cnpj' => $this->cnpj(901), 'razao_social' => 'Posto Central', 'ramos' => ['combustivel']];
        $this->como($g, $t)->postJson('/api/transporte/fornecedores', $dados)->assertCreated();

        $this->como($g, $t)->postJson('/api/transporte/fornecedores', $dados)->assertStatus(409);
        $this->como($g, $t)->postJson('/api/transporte/fornecedores', [...$dados, 'cnpj' => $this->cnpj(902), 'ramos' => []])->assertUnprocessable();
        $this->como($g, $t)->postJson('/api/transporte/fornecedores', [...$dados, 'cnpj' => $this->cnpj(903), 'ramos' => ['joalheria']])->assertUnprocessable();
    }

    public function test_mesma_pessoa_pode_ser_empresa_de_transporte_e_fornecedora(): void
    {
        [$t, $g] = $this->cenario();
        $cnpj = $this->cnpj(910);
        $this->como($g, $t)->postJson('/api/transporte/empresas', $this->dadosEmpresa(['cnpj' => $cnpj, 'razao_social' => 'Viação Dupla Ltda']))->assertCreated();

        $this->como($g, $t)->postJson('/api/transporte/fornecedores', ['cnpj' => $cnpj, 'razao_social' => 'Viação Dupla Ltda', 'ramos' => ['mecanica']])->assertCreated();

        $this->assertSame(1, \Modules\Pessoas\Models\Pessoa::query()->where('razao_social', 'Viação Dupla Ltda')->count());
    }

    public function test_fornecedor_com_ordem_nao_e_excluido_so_inativado(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $forn = $this->criarFornecedor($t, $g);
        $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['fornecedor_id' => $forn]))->assertCreated();

        $this->como($g, $t)->deleteJson("/api/transporte/fornecedores/{$forn}")->assertStatus(409);
        $this->como($g, $t)->putJson("/api/transporte/fornecedores/{$forn}", ['ramos' => ['mecanica'], 'ativo' => false])->assertOk()->assertJsonPath('data.ativo', false);
        $outro = $this->criarFornecedor($t, $g);
        $this->como($g, $t)->deleteJson("/api/transporte/fornecedores/{$outro}")->assertOk();
        $this->assertSame(1, Fornecedor::query()->count());
    }

    public function test_fornecedor_inativo_nao_recebe_ordem(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $forn = $this->criarFornecedor($t, $g, ['ativo' => false]);

        $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['fornecedor_id' => $forn]))->assertStatus(409);
    }

    // --- Ordens de serviço ----------------------------------------------------------------------------------------

    public function test_fluxo_da_ordem_abrir_e_concluir_atualiza_o_hodometro_e_audita(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$veiculo}/quilometragem", ['km' => 40000])->assertOk();
        $forn = $this->criarFornecedor($t, $g);

        $ordem = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['fornecedor_id' => $forn]))
            ->assertCreated()->assertJsonPath('data.status', 'aberta')->assertJsonPath('data.tipo_rotulo', 'Corretiva')->json('data.id');
        $r = $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$ordem}/concluir", ['concluida_em' => now()->toDateString(), 'km' => 41200, 'valor' => 1850.5]);

        $r->assertOk()->assertJsonPath('data.status', 'concluida')->assertJsonPath('data.km', 41200)->assertJsonPath('data.valor', 1850.5);
        $this->assertSame(41200, Veiculo::query()->findOrFail($veiculo)->km_atual);
        $this->assertNotNull(AuditLog::query()->where('action', 'ordem_servico.concluida')->first());
    }

    public function test_quilometragem_menor_que_a_atual_e_recusada_ao_concluir(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$veiculo}/quilometragem", ['km' => 40000])->assertOk();
        $ordem = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo))->json('data.id');

        $r = $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$ordem}/concluir", ['concluida_em' => now()->toDateString(), 'km' => 39000])->assertStatus(422);

        $this->assertStringContainsString('40000', (string) $r->json('error'));
        $this->assertSame('aberta', OrdemServico::query()->findOrFail($ordem)->status);
        $this->assertSame(40000, Veiculo::query()->findOrFail($veiculo)->km_atual);
    }

    public function test_conclusao_antes_da_abertura_ou_no_futuro_e_recusada(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $ordem = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo))->json('data.id');

        $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$ordem}/concluir", ['concluida_em' => now()->subDays(10)->toDateString()])->assertStatus(422);
        $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$ordem}/concluir", ['concluida_em' => now()->addDays(2)->toDateString()])->assertStatus(422);
        $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['aberta_em' => now()->addDay()->toDateString()]))->assertStatus(422);
    }

    public function test_ordem_concluida_ou_cancelada_nao_e_editada(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $a = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo))->json('data.id');
        $b = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['descricao' => 'Revisão geral', 'tipo' => 'revisao']))->json('data.id');
        $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$a}/concluir", ['concluida_em' => now()->toDateString()])->assertOk();
        $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$b}/cancelar", ['motivo' => 'Veículo vendido'])->assertOk()->assertJsonPath('data.status', 'cancelada');

        foreach ([$a, $b] as $id) {
            $this->como($g, $t)->putJson("/api/transporte/ordens-servico/{$id}", $this->dadosOrdem($veiculo, ['descricao' => 'Outra']))->assertStatus(409);
            $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$id}/concluir", ['concluida_em' => now()->toDateString()])->assertStatus(409);
            $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$id}/cancelar")->assertStatus(409);
        }
    }

    public function test_ordem_aberta_pode_ser_alterada_e_a_lista_filtra(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $outro = $this->criarVeiculo($t, $g);
        $a = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo))->json('data.id');
        $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($outro))->assertCreated();

        $this->como($g, $t)->putJson("/api/transporte/ordens-servico/{$a}", $this->dadosOrdem($veiculo, ['descricao' => 'Troca do radiador', 'valor' => 900]))->assertOk()->assertJsonPath('data.descricao', 'Troca do radiador');
        $this->assertSame(1, $this->como($g, $t)->getJson("/api/transporte/ordens-servico?veiculo_id={$veiculo}")->json('total'));
        $this->assertSame(2, $this->como($g, $t)->getJson('/api/transporte/ordens-servico?status=aberta')->json('total'));
        $this->assertSame(0, $this->como($g, $t)->getJson('/api/transporte/ordens-servico?status=concluida')->json('total'));
    }

    public function test_dados_invalidos_da_ordem_sao_recusados(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $post = fn (array $extra) => $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, $extra));

        $post(['tipo' => 'lavagem'])->assertUnprocessable();
        $post(['descricao' => 'ab'])->assertUnprocessable();
        $post(['valor' => -5])->assertUnprocessable();
        $post(['veiculo_id' => 99999])->assertUnprocessable();
        $this->assertSame(0, OrdemServico::query()->count());
    }

    // --- Quilometragem --------------------------------------------------------------------------------------------

    public function test_reduzir_o_hodometro_exige_confirmacao_e_audita_o_valor_anterior(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$veiculo}/quilometragem", ['km' => 50000])->assertOk()->assertJsonPath('data.km_atual', 50000);

        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$veiculo}/quilometragem", ['km' => 45000])->assertStatus(422);
        $this->assertSame(50000, Veiculo::query()->findOrFail($veiculo)->km_atual);
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$veiculo}/quilometragem", ['km' => 45000, 'confirmar_reducao' => true])->assertOk()->assertJsonPath('data.km_atual', 45000);

        $log = AuditLog::query()->where('action', 'veiculo.hodometro_corrigido')->firstOrFail();
        $this->assertSame([50000, 45000], [$log->before['km_atual'], $log->after['km_atual']]);
    }

    // --- Manutenção prevista e alertas ----------------------------------------------------------------------------

    public function test_previsao_exige_data_ou_quilometragem(): void
    {
        [$t, $g, $veiculo] = $this->cenario();

        $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Troca de óleo'])->assertStatus(422);
        $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Troca de óleo', 'km_previsto' => 50000])->assertCreated();
        $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Revisão', 'data_prevista' => now()->addDays(40)->toDateString()])->assertCreated();
    }

    public function test_previsao_por_data_gera_alerta_de_atencao_e_critico(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Revisão dos freios', 'data_prevista' => now()->addDays(20)->toDateString()])->assertCreated();
        $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Correia dentada', 'data_prevista' => now()->subDays(2)->toDateString()])->assertCreated();
        $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Alinhamento', 'data_prevista' => now()->addDays(90)->toDateString()])->assertCreated();

        $alertas = array_values(array_filter($this->como($g, $t)->getJson('/api/transporte/alertas')->json('data'), fn (array $a): bool => $a['tipo'] === 'manutencao'));

        $this->assertSame(['critico', 'atencao'], array_column($alertas, 'gravidade'));
        $this->assertStringContainsString('Correia dentada', $alertas[0]['item']);
    }

    public function test_previsao_por_quilometragem_alerta_a_500_km_e_quando_vence(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $this->como($g, $t)->putJson("/api/transporte/veiculos/{$veiculo}/quilometragem", ['km' => 49600])->assertOk();
        foreach ([['Óleo', 50000], ['Pneus', 49000], ['Suspensão', 60000]] as [$descricao, $km]) {
            $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => $descricao, 'km_previsto' => $km])->assertCreated();
        }

        $alertas = array_values(array_filter($this->como($g, $t)->getJson('/api/transporte/alertas')->json('data'), fn (array $a): bool => $a['tipo'] === 'manutencao'));
        $porItem = [];
        foreach ($alertas as $a) {
            $porItem[explode(' — ', $a['item'])[1]] = [$a['gravidade'], $a['km_restante'], $a['data']];
        }

        $this->assertEquals(['Óleo' => ['atencao', 400, null], 'Pneus' => ['critico', -600, null]], $porItem);
    }

    public function test_previsao_por_km_sem_hodometro_nao_alerta(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Óleo', 'km_previsto' => 10])->assertCreated();

        $this->assertSame([], array_values(array_filter($this->como($g, $t)->getJson('/api/transporte/alertas')->json('data'), fn (array $a): bool => $a['tipo'] === 'manutencao')));
    }

    public function test_converter_cria_ordem_aberta_marca_a_previsao_e_tira_o_alerta(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $forn = $this->criarFornecedor($t, $g);
        $prev = $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Revisão dos 50 mil', 'data_prevista' => now()->subDay()->toDateString()])->json('data.id');

        $r = $this->como($g, $t)->postJson("/api/transporte/manutencoes-previstas/{$prev}/converter", ['fornecedor_id' => $forn])->assertCreated();

        $r->assertJsonPath('data.status', 'aberta')->assertJsonPath('data.tipo', 'preventiva')->assertJsonPath('data.descricao', 'Revisão dos 50 mil')->assertJsonPath('data.fornecedor.id', $forn);
        $this->assertSame([], $this->como($g, $t)->getJson('/api/transporte/manutencoes-previstas')->json('data'));
        $this->assertCount(1, $this->como($g, $t)->getJson('/api/transporte/manutencoes-previstas?status=convertida')->json('data'));
        $this->como($g, $t)->postJson("/api/transporte/manutencoes-previstas/{$prev}/converter")->assertStatus(409);
        $this->como($g, $t)->postJson("/api/transporte/manutencoes-previstas/{$prev}/cancelar")->assertStatus(409);
    }

    public function test_cancelar_previsao_tira_o_alerta(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $prev = $this->como($g, $t)->postJson('/api/transporte/manutencoes-previstas', ['veiculo_id' => $veiculo, 'descricao' => 'Óleo', 'data_prevista' => now()->subDay()->toDateString()])->json('data.id');

        $this->como($g, $t)->postJson("/api/transporte/manutencoes-previstas/{$prev}/cancelar")->assertOk()->assertJsonPath('data.status', 'cancelada');

        $this->assertSame([], array_values(array_filter($this->como($g, $t)->getJson('/api/transporte/alertas')->json('data'), fn (array $a): bool => $a['tipo'] === 'manutencao')));
    }

    // --- Veículo em manutenção ------------------------------------------------------------------------------------

    public function test_veiculo_em_manutencao_gera_aviso_na_rota_sem_impedir_nem_alterar_rotas_gravadas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $c = $this->rotaPronta($t, $g, 40);
        $this->como($g, $t)->getJson("/api/transporte/rotas/{$c['rota']}")->assertOk();
        $ordem = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($c['veiculo']))->json('data.id');

        $veiculos = $this->como($g, $t)->getJson('/api/transporte/veiculos')->json('data');
        $this->assertTrue($veiculos[0]['em_manutencao']);
        $rota = $this->como($g, $t)->getJson("/api/transporte/rotas/{$c['rota']}")->json('data');
        $r = $this->como($g, $t)->putJson("/api/transporte/rotas/{$c['rota']}", [
            'escola_id' => $c['escola']->id, 'ano_letivo' => 2026, 'turno' => $rota['turno'], 'tipo_rede' => $rota['tipo_rede'], 'nome' => 'Rota renomeada', 'veiculo_id' => $c['veiculo'],
        ])->assertOk();

        $this->assertStringContainsString('em manutenção', (string) $r->json('avisos.0'));
        $this->assertTrue($rota['regular'], 'a rota gravada não vira irregular por causa da ordem');
        $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$ordem}/cancelar")->assertOk();
        $this->assertSame([], $this->como($g, $t)->putJson("/api/transporte/rotas/{$c['rota']}", [
            'escola_id' => $c['escola']->id, 'ano_letivo' => 2026, 'turno' => $rota['turno'], 'tipo_rede' => $rota['tipo_rede'], 'nome' => 'Rota renomeada', 'veiculo_id' => $c['veiculo'],
        ])->json('avisos'));
    }

    // --- Relatórios -----------------------------------------------------------------------------------------------

    public function test_gastos_do_ano_somam_so_ordens_concluidas_por_veiculo_fornecedor_e_tipo(): void
    {
        [$t, $g, $v1] = $this->cenario();
        $v2 = $this->criarVeiculo($t, $g);
        $f1 = $this->criarFornecedor($t, $g);
        $feita = function (int $veiculo, ?int $fornecedor, string $tipo, float $valor, ?string $data = null) use ($t, $g): void {
            $id = $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['fornecedor_id' => $fornecedor, 'tipo' => $tipo, 'aberta_em' => now()->subDays(20)->toDateString()]))->json('data.id');
            $this->como($g, $t)->postJson("/api/transporte/ordens-servico/{$id}/concluir", ['concluida_em' => $data ?? now()->subDays(10)->toDateString(), 'valor' => $valor])->assertOk();
        };
        $feita($v1, $f1, 'corretiva', 1000);
        $feita($v1, $f1, 'preventiva', 500);
        $feita($v2, null, 'corretiva', 250.25);
        $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($v2, ['valor' => 9999]))->assertCreated();

        $r = $this->como($g, $t)->getJson('/api/transporte/manutencao/gastos?ano=' . now()->year)->assertOk()->json('data');

        $this->assertEquals([1750.25, 3], [$r['total'], $r['ordens']]);
        $this->assertEquals([1500.0, 250.25], array_column($r['por_veiculo'], 'valor'));
        $this->assertEquals([1500.0, 250.25], array_column($r['por_fornecedor'], 'valor'));
        $this->assertSame('Serviço interno (sem fornecedor)', $r['por_fornecedor'][1]['nome']);
        $this->assertEqualsCanonicalizing(['Corretiva', 'Preventiva'], array_column($r['por_tipo'], 'nome'));
        $this->assertSame(0.0, (float) $this->como($g, $t)->getJson('/api/transporte/manutencao/gastos?ano=2001')->json('data.total'));
    }

    public function test_historico_do_veiculo_e_csv_auditado_com_formula_neutralizada(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['descricao' => '=SOMA(A1)']))->assertCreated();
        $this->como($g, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo, ['descricao' => 'Alinhamento', 'tipo' => 'outro']))->assertCreated();

        $h = $this->como($g, $t)->getJson("/api/transporte/veiculos/{$veiculo}/manutencao")->assertOk()->json('data');
        $csv = $this->como($g, $t)->get('/api/transporte/manutencao/gastos/csv?ano=' . now()->year)->assertOk()->getContent();

        $this->assertCount(2, $h);
        $this->assertStringStartsWith("\xEF\xBB\xBFVeículo;Tipo", (string) $csv);
        $this->assertStringContainsString("'=SOMA(A1)", (string) $csv);
        $this->assertSame(2, AuditLog::query()->where('action', 'manutencao.exportada')->firstOrFail()->after['ordens']);
    }

    // --- Permissões e isolamento ----------------------------------------------------------------------------------

    public function test_permissoes_consulta_nao_ve_manutencao_e_operador_gerencia(): void
    {
        [$t, $g, $veiculo] = $this->cenario();
        $consulta = $this->usuario($t, ['transporte_consulta']);
        $operador = $this->usuario($t, ['transporte_operador']);

        foreach (['/api/transporte/fornecedores', '/api/transporte/ordens-servico', '/api/transporte/manutencoes-previstas', '/api/transporte/manutencao/gastos?ano=2026', "/api/transporte/veiculos/{$veiculo}/manutencao"] as $url) {
            $this->como($consulta, $t)->getJson($url)->assertForbidden();
            $this->como($operador, $t)->getJson($url)->assertOk();
        }
        $this->como($consulta, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo))->assertForbidden();
        $this->como($consulta, $t)->putJson("/api/transporte/veiculos/{$veiculo}/quilometragem", ['km' => 1])->assertForbidden();
        $this->como($operador, $t)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculo))->assertCreated();
        $perm = $this->como($consulta, $t)->getJson('/api/transporte/opcoes')->json('data.permissoes');
        $this->assertSame([false, false], [$perm['ver_manutencao'], $perm['gerenciar_manutencao']]);
    }

    public function test_dados_de_outro_orgao_nao_aparecem_nem_se_alteram(): void
    {
        [$a, $ga, $veiculoA] = $this->cenario();
        $ordemA = $this->como($ga, $a)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculoA))->json('data.id');
        $fornA = $this->criarFornecedor($a, $ga);
        $b = $this->criarTenant('prefeitura-b');
        $gb = $this->usuario($b, ['transporte_coordenacao']);

        $this->assertSame(0, $this->como($gb, $b)->getJson('/api/transporte/ordens-servico')->json('total'));
        $this->como($gb, $b)->postJson("/api/transporte/ordens-servico/{$ordemA}/cancelar")->assertNotFound();
        $this->como($gb, $b)->putJson("/api/transporte/fornecedores/{$fornA}", ['ramos' => ['seguro']])->assertNotFound();
        $this->como($gb, $b)->postJson('/api/transporte/ordens-servico', $this->dadosOrdem($veiculoA))->assertUnprocessable();
        $this->como($gb, $b)->putJson("/api/transporte/veiculos/{$veiculoA}/quilometragem", ['km' => 5])->assertNotFound();
        $this->assertSame(0.0, (float) $this->como($gb, $b)->getJson('/api/transporte/manutencao/gastos?ano=' . now()->year)->json('data.total'));
    }
}

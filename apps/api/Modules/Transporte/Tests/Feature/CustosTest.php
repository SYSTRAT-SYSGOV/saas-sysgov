<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Custo\CalculadoraCustoRota;
use Modules\Transporte\Models\CustoParametro;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class CustosTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    /** Parâmetros do caso de referência, conferidos à mão (rodoviário). */
    private const ROD = [
        'dias_letivos_mes' => 20, 'meses_letivos' => 10, 'viagens_por_dia' => 2, 'meses_custo_fixo' => 12,
        'salario_motorista' => 3000, 'motoristas_por_veiculo' => 1, 'encargos_sociais_pct' => 40, 'custo_administrativo_pct' => 10,
        'taxa_remuneracao_pct' => 12, 'preco_combustivel' => 6,
        'rod_preco_veiculo' => 400000, 'rod_vida_util_anos' => 10, 'rod_valor_residual_pct' => 20, 'rod_seguro_anual' => 6000,
        'rod_rendimento_km_l' => 4, 'rod_coef_oleo' => 0.002, 'rod_n_pneus' => 6, 'rod_preco_pneu' => 2000, 'rod_preco_recapagem' => 800,
        'rod_n_recapagens' => 2, 'rod_vida_util_pneu_km' => 100000, 'rod_coef_pecas_anual' => 0.05,
    ];

    private const AQUA = [
        'dias_letivos_mes' => 20, 'meses_letivos' => 10, 'viagens_por_dia' => 2, 'meses_custo_fixo' => 12,
        'salario_motorista' => 3000, 'motoristas_por_veiculo' => 1, 'encargos_sociais_pct' => 40, 'custo_administrativo_pct' => 5,
        'taxa_remuneracao_pct' => 12, 'preco_combustivel' => 6,
        'aqua_preco_veiculo' => 300000, 'aqua_vida_util_anos' => 20, 'aqua_valor_residual_pct' => 10, 'aqua_seguro_anual' => 3600,
        'aqua_manutencao_anual_pct' => 3, 'aqua_rendimento_km_l' => 2, 'aqua_coef_oleo' => 0.001,
    ];

    /** @param array<string, float|int|string|null> $valores */
    private function gravarParametros(Tenant $t, User $g, array $valores, int $ano = 2026): void
    {
        $this->como($g, $t)->putJson('/api/transporte/custos/parametros', ['ano' => $ano, 'valores' => $valores])->assertOk();
    }

    // --- Fórmula pura ---------------------------------------------------------------------------------------------

    public function test_calculadora_rodoviaria_bate_com_o_caso_conferido_a_mao(): void
    {
        $r = CalculadoraCustoRota::calcular('rod', self::ROD, 20.0, 10, 5);

        $this->assertTrue($r['completo']);
        $this->assertSame(['pessoal' => 4200.0, 'administrativo' => 420.0, 'depreciacao' => 2424.24, 'remuneracao_capital' => 2560.0, 'seguro' => 500.0], $r['fixo']);
        $this->assertSame(['combustivel' => 1.5, 'lubrificantes' => 0.012, 'rodagem' => 0.216, 'pecas' => 2.5], $r['variavel']);
        $this->assertSame(10104.24, $r['custo_fixo_mensal']);
        $this->assertSame(4.228, $r['custo_variavel_km']);
        $this->assertSame([800.0, 8000.0], [$r['km_mes'], $r['km_ano']]);
        $this->assertSame([13486.64, 155074.91], [$r['custo_mensal'], $r['custo_anual']]);
        $this->assertSame([19.38, 775.37], [$r['custo_por_km'], $r['custo_por_dia_letivo']]);
        $this->assertSame([1348.66, 15507.49], [$r['custo_por_aluno_mes'], $r['custo_por_aluno_ano']]);
    }

    public function test_calculadora_aquaviaria_usa_manutencao_e_nao_tem_rodagem_nem_pecas(): void
    {
        $r = CalculadoraCustoRota::calcular('aqua', self::AQUA, 10.0, 5, 4);

        $this->assertTrue($r['completo']);
        $this->assertSame(['pessoal', 'administrativo', 'depreciacao', 'remuneracao_capital', 'seguro', 'manutencao'], array_keys($r['fixo']));
        $this->assertSame(['combustivel', 'lubrificantes'], array_keys($r['variavel']));
        $this->assertSame([8891.79, 3.006, 10094.19, 118725.43], [$r['custo_fixo_mensal'], $r['custo_variavel_km'], $r['custo_mensal'], $r['custo_anual']]);
    }

    public function test_veiculo_mais_velho_que_a_vida_util_nao_tem_depreciacao(): void
    {
        $r = CalculadoraCustoRota::calcular('rod', self::ROD, 20.0, 10, 30);

        $this->assertSame(0.0, $r['fixo']['depreciacao']);
        $this->assertGreaterThan(0, $r['fixo']['remuneracao_capital']);
    }

    public function test_sem_alunos_o_custo_por_aluno_e_indefinido_e_nao_zero(): void
    {
        $r = CalculadoraCustoRota::calcular('rod', self::ROD, 20.0, 0, 5);

        $this->assertSame(13486.64, $r['custo_mensal']);
        $this->assertNull($r['custo_por_aluno_mes']);
        $this->assertNull($r['custo_por_aluno_ano']);
    }

    public function test_parametro_faltando_deixa_o_calculo_incompleto_e_lista_o_que_falta(): void
    {
        $parametros = self::ROD;
        unset($parametros['rod_preco_veiculo'], $parametros['preco_combustivel']);

        $r = CalculadoraCustoRota::calcular('rod', $parametros, 0.0, 3, null);

        $this->assertFalse($r['completo']);
        $this->assertEqualsCanonicalizing(['rod_preco_veiculo', 'preco_combustivel', 'km_rota', 'ano_fabricacao'], array_column($r['faltando'], 'chave'));
        $this->assertNull($r['custo_mensal']);
        $this->assertNull($r['custo_anual']);
    }

    public function test_parametro_do_outro_modal_nao_e_exigido(): void
    {
        $r = CalculadoraCustoRota::calcular('aqua', self::AQUA, 10.0, 1, 1);

        $this->assertTrue($r['completo'], 'a embarcação não precisa de pneus nem de peças');
    }

    // --- Parâmetros -----------------------------------------------------------------------------------------------

    public function test_catalogo_traz_so_as_constantes_do_calendario_como_padrao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $r = $this->como($g, $t)->getJson('/api/transporte/custos/parametros?ano=2026')->assertOk();

        $porChave = array_column($r->json('data.parametros'), null, 'chave');
        $this->assertSame([20, 'padrao'], [$porChave['dias_letivos_mes']['valor'], $porChave['dias_letivos_mes']['origem']]);
        $this->assertNull($porChave['salario_motorista']['valor'], 'salário é dado do órgão: sem valor inventado');
        $this->assertNull($porChave['preco_combustivel']['origem']);
        $this->assertArrayHasKey('calendario', $r->json('data.grupos'));
    }

    public function test_salvar_parametros_apagar_volta_ao_padrao_e_e_auditado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $this->gravarParametros($t, $g, ['dias_letivos_mes' => '22', 'salario_motorista' => 3500.5]);
        $porChave = fn () => array_column($this->como($g, $t)->getJson('/api/transporte/custos/parametros?ano=2026')->json('data.parametros'), null, 'chave');
        $this->assertEquals([22, 'orgao'], [$porChave()['dias_letivos_mes']['valor'], $porChave()['dias_letivos_mes']['origem']]);
        $this->assertEquals(3500.5, $porChave()['salario_motorista']['valor']);

        $this->gravarParametros($t, $g, ['dias_letivos_mes' => null]);
        $this->assertSame([20, 'padrao'], [$porChave()['dias_letivos_mes']['valor'], $porChave()['dias_letivos_mes']['origem']]);
        $this->assertSame(1, CustoParametro::query()->count());
        $log = AuditLog::query()->where('action', 'custos.parametros_salvos')->latest('id')->firstOrFail();
        $this->assertSame(2026, $log->after['ano']);
    }

    public function test_valor_fora_da_faixa_chave_desconhecida_e_texto_sao_recusados(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $put = fn (array $v) => $this->como($g, $t)->putJson('/api/transporte/custos/parametros', ['ano' => 2026, 'valores' => $v]);

        $this->assertStringContainsString('entre', (string) $put(['encargos_sociais_pct' => -5])->assertStatus(422)->json('error'));
        $this->assertStringContainsString('entre', (string) $put(['dias_letivos_mes' => 40])->assertStatus(422)->json('error'));
        $this->assertStringContainsString('desconhecido', (string) $put(['inventado' => 1])->assertStatus(422)->json('error'));
        $this->assertStringContainsString('número', (string) $put(['salario_motorista' => 'abc'])->assertStatus(422)->json('error'));
        $this->assertSame(0, CustoParametro::query()->count());
    }

    public function test_copiar_de_um_ano_para_outro_recusa_destino_ocupado_ate_confirmar(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->gravarParametros($t, $g, ['salario_motorista' => 3000, 'preco_combustivel' => 6], 2026);

        $this->como($g, $t)->postJson('/api/transporte/custos/parametros/copiar', ['de' => 2026, 'para' => 2027])->assertOk()->assertJsonPath('copiados', 2);
        $this->gravarParametros($t, $g, ['preco_combustivel' => 7], 2027);
        $this->como($g, $t)->postJson('/api/transporte/custos/parametros/copiar', ['de' => 2026, 'para' => 2027])->assertStatus(409);
        $this->como($g, $t)->postJson('/api/transporte/custos/parametros/copiar', ['de' => 2026, 'para' => 2027, 'sobrescrever' => true])->assertOk();
        $this->assertSame(6.0, (float) CustoParametro::query()->where('ano', 2027)->where('chave', 'preco_combustivel')->value('valor'));
        $this->como($g, $t)->postJson('/api/transporte/custos/parametros/copiar', ['de' => 2030, 'para' => 2031])->assertStatus(422);
        $this->como($g, $t)->postJson('/api/transporte/custos/parametros/copiar', ['de' => 2026, 'para' => 2026])->assertStatus(422);
    }

    // --- Custo da rota --------------------------------------------------------------------------------------------

    /**
     * @param array<string, mixed> $veiculo
     * @param array<string, mixed> $rota
     * @return array{0: Tenant, 1: User, 2: array{rota: int, parada: int, veiculo: int, escola: \Modules\Escola\Models\Escola}}
     */
    private function cenarioRota(array $veiculo = [], array $rota = [], int $alunos = 10): array
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $c = $this->rotaPronta($t, $g, 50, ['ano_fabricacao' => 2021, ...$veiculo], ['km_pavimentado' => 12.5, 'km_nao_pavimentado' => 7.5, ...$rota]);
        for ($i = 0; $i < $alunos; $i++) {
            $this->alocar($t, $g, $c['rota'], $c['parada'], $this->criarAluno($t, $c['escola'], "Aluno {$i}"))->assertCreated();
        }

        return [$t, $g, $c];
    }

    public function test_custo_da_rota_rodoviaria_pela_api(): void
    {
        [$t, $g, $c] = $this->cenarioRota();
        $this->gravarParametros($t, $g, self::ROD);

        $r = $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}")->assertOk();

        $r->assertJsonPath('data.modal', 'rodoviario')->assertJsonPath('data.completo', true)->assertJsonPath('data.alunos', 10)
            ->assertJsonPath('data.custo_mensal', 13486.64)->assertJsonPath('data.custo_anual', 155074.91)->assertJsonPath('data.custo_por_aluno_mes', 1348.66)
            ->assertJsonPath('data.fixo.depreciacao', 2424.24)->assertJsonPath('data.simulado', false);
    }

    public function test_rota_sem_parametros_e_incompleta_e_lista_o_que_falta(): void
    {
        [$t, $g, $c] = $this->cenarioRota(alunos: 0);

        $r = $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}")->assertOk();

        $r->assertJsonPath('data.completo', false)->assertJsonPath('data.custo_mensal', null);
        $this->assertContains('salario_motorista', array_column($r->json('data.faltando'), 'chave'));
    }

    public function test_rota_sem_veiculo_nao_tem_modal_nem_calculo(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $rota = $this->criarRota($t, $g, $this->criarEscola($t));

        $r = $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$rota}")->assertOk();

        $r->assertJsonPath('data.modal', null)->assertJsonPath('data.completo', false)->assertJsonPath('data.faltando.0.chave', 'veiculo');
    }

    public function test_tipologia_aquaviaria_define_o_modal(): void
    {
        [$t, $g, $c] = $this->cenarioRota(['tipologia_inep' => 8], ['km_pavimentado' => 0, 'km_nao_pavimentado' => 10], 5);
        $this->gravarParametros($t, $g, self::AQUA);

        $r = $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}")->assertOk();

        $r->assertJsonPath('data.modal', 'aquaviario')->assertJsonPath('data.completo', true)->assertJsonPath('data.custo_mensal', 9987.04)
            ->assertJsonPath('data.custo_anual', 117439.71);
    }

    public function test_simulacao_nao_altera_os_parametros_salvos(): void
    {
        [$t, $g, $c] = $this->cenarioRota();
        $this->gravarParametros($t, $g, self::ROD);

        $r = $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}?simular[preco_combustivel]=9")->assertOk();

        $this->assertGreaterThan(13486.64, $r->json('data.custo_mensal'));
        $r->assertJsonPath('data.simulado', true);
        $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}")->assertJsonPath('data.custo_mensal', 13486.64);
        $this->assertSame(6.0, (float) CustoParametro::query()->where('chave', 'preco_combustivel')->value('valor'));
        $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}?simular[preco_combustivel]=-1")->assertStatus(422);
        $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}?simular[inventado]=1")->assertStatus(422);
    }

    public function test_contratado_acima_do_estimado_e_sinalizado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $locadora = $this->criarEmpresa($t, $g, ['tipo' => 'locadora']);
        $c = $this->rotaPronta($t, $g, 50, ['origem' => 'locada', 'empresa_id' => $locadora, 'ano_fabricacao' => 2021], ['km_pavimentado' => 12.5, 'km_nao_pavimentado' => 7.5]);
        for ($i = 0; $i < 10; $i++) {
            $this->alocar($t, $g, $c['rota'], $c['parada'], $this->criarAluno($t, $c['escola'], "Aluno {$i}"))->assertCreated();
        }
        $this->gravarParametros($t, $g, self::ROD);
        $rota = $this->como($g, $t)->getJson("/api/transporte/rotas/{$c['rota']}")->json('data');
        $this->como($g, $t)->putJson("/api/transporte/rotas/{$c['rota']}", [
            'escola_id' => $c['escola']->id, 'ano_letivo' => 2026, 'turno' => $rota['turno'], 'tipo_rede' => $rota['tipo_rede'], 'nome' => $rota['nome'],
            'veiculo_id' => $c['veiculo'], 'km_pavimentado' => 12.5, 'km_nao_pavimentado' => 7.5, 'custo_contratado_mensal' => 16500,
        ])->assertOk()->assertJsonPath('data.custo_contratado_mensal', 16500);

        $r = $this->como($g, $t)->getJson("/api/transporte/custos/rotas/{$c['rota']}")->assertOk();

        $r->assertJsonPath('data.comparativo.diferenca', 3013.36)->assertJsonPath('data.comparativo.percentual', 22.3)->assertJsonPath('data.comparativo.acima_do_limite', true);
    }

    public function test_veiculo_proprio_nao_aceita_custo_contratado(): void
    {
        [$t, $g, $c] = $this->cenarioRota(alunos: 0);
        $rota = $this->como($g, $t)->getJson("/api/transporte/rotas/{$c['rota']}")->json('data');

        $r = $this->como($g, $t)->putJson("/api/transporte/rotas/{$c['rota']}", [
            'escola_id' => $c['escola']->id, 'ano_letivo' => 2026, 'turno' => $rota['turno'], 'tipo_rede' => $rota['tipo_rede'], 'nome' => $rota['nome'],
            'veiculo_id' => $c['veiculo'], 'custo_contratado_mensal' => 1000,
        ])->assertStatus(422);

        $this->assertStringContainsString('veículo próprio', (string) $r->json('error'));
    }

    // --- Características do trecho --------------------------------------------------------------------------------

    public function test_caracteristicas_do_trecho_no_cadastro_filtro_e_catalogo_fechado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $a = $this->criarRota($t, $g, $escola, ['caracteristicas' => ['porteira', 'atoleiro', 'porteira']]);
        $this->criarRota($t, $g, $escola, ['caracteristicas' => ['ponte_rustica']]);
        $this->criarRota($t, $g, $escola);

        $this->como($g, $t)->getJson("/api/transporte/rotas/{$a}")->assertJsonPath('data.caracteristicas', ['porteira', 'atoleiro']);
        $filtradas = $this->como($g, $t)->getJson('/api/transporte/rotas?caracteristica=porteira')->json('data');
        $this->assertSame([$a], array_column($filtradas, 'id'));
        $this->como($g, $t)->postJson('/api/transporte/rotas', $this->dadosRota($t, $g, $escola, ['caracteristicas' => ['jacare']]))->assertUnprocessable();
        $this->assertCount(5, $this->como($g, $t)->getJson('/api/transporte/opcoes')->json('data.caracteristicas_trecho'));
    }

    // --- Relatório ------------------------------------------------------------------------------------------------

    public function test_relatorio_totaliza_por_escola_e_so_soma_rotas_completas(): void
    {
        [$t, $g, $c] = $this->cenarioRota();
        $this->gravarParametros($t, $g, self::ROD);
        $outra = $this->rotaPronta($t, $g, 50, ['placa' => 'ZZZ9Z99'], ['nome' => 'Rota sem ano do veículo'], $c['escola']);
        $this->assertNotSame(0, $outra['rota']);

        $r = $this->como($g, $t)->getJson('/api/transporte/custos/relatorio?ano=2026')->assertOk();

        $this->assertSame(2, $r->json('data.totais.rotas'));
        $this->assertSame(1, $r->json('data.totais.completas'));
        $this->assertSame(155074.91, $r->json('data.totais.custo_anual'));
        $this->assertSame(15507.49, $r->json('data.totais.custo_por_aluno_ano'));
        $escolas = array_column($r->json('data.por_escola'), null, 'id');
        $this->assertSame(1, $escolas[$c['escola']->id]['incompletas']);
        $this->como($g, $t)->getJson('/api/transporte/custos/relatorio?ano=2026&modal=aquaviario')->assertJsonPath('data.totais.rotas', 0);
        $this->como($g, $t)->getJson('/api/transporte/custos/relatorio')->assertStatus(422);
    }

    public function test_csv_neutraliza_formula_e_a_exportacao_e_auditada(): void
    {
        [$t, $g] = $this->cenarioRota(['ano_fabricacao' => 2021], ['nome' => '=HYPERLINK("x")'], 2);
        $this->gravarParametros($t, $g, self::ROD);

        $r = $this->como($g, $t)->get('/api/transporte/custos/relatorio/csv?ano=2026')->assertOk();

        $csv = $r->getContent();
        $this->assertStringStartsWith("\xEF\xBB\xBFRota;Escola", (string) $csv);
        $this->assertStringContainsString("'=HYPERLINK", (string) $csv);
        $this->assertStringContainsString('155074,91', (string) $csv);
        $log = AuditLog::query()->where('action', 'custos.exportado')->latest('id')->firstOrFail();
        $this->assertSame(1, $log->after['linhas']);
    }

    // --- Permissões e isolamento ----------------------------------------------------------------------------------

    public function test_permissoes_ver_custo_e_alterar_parametros(): void
    {
        $t = $this->criarTenant();
        $operador = $this->usuario($t, ['transporte_operador']);
        $consulta = $this->usuario($t, ['transporte_consulta']);

        $this->como($operador, $t)->getJson('/api/transporte/custos/parametros?ano=2026')->assertOk();
        $this->como($operador, $t)->putJson('/api/transporte/custos/parametros', ['ano' => 2026, 'valores' => ['preco_combustivel' => 6]])->assertForbidden();
        $this->como($operador, $t)->postJson('/api/transporte/custos/parametros/copiar', ['de' => 2026, 'para' => 2027])->assertForbidden();
        $this->como($consulta, $t)->getJson('/api/transporte/custos/parametros?ano=2026')->assertForbidden();
        $this->como($consulta, $t)->getJson('/api/transporte/custos/relatorio?ano=2026')->assertForbidden();
        $this->como($consulta, $t)->get('/api/transporte/custos/relatorio/csv?ano=2026')->assertForbidden();
        $opcoes = $this->como($operador, $t)->getJson('/api/transporte/opcoes')->json('data.permissoes');
        $this->assertSame([true, false], [$opcoes['ver_custos'], $opcoes['gerenciar_parametros_custo']]);
    }

    public function test_parametros_e_rotas_de_outro_orgao_nao_aparecem(): void
    {
        [$a, $ga, $ca] = $this->cenarioRota(alunos: 0);
        $this->gravarParametros($a, $ga, self::ROD);
        $b = $this->criarTenant('prefeitura-b');
        $gb = $this->usuario($b, ['transporte_coordenacao']);

        $paramsB = array_column($this->como($gb, $b)->getJson('/api/transporte/custos/parametros?ano=2026')->json('data.parametros'), null, 'chave');
        $this->assertNull($paramsB['salario_motorista']['valor']);
        $this->como($gb, $b)->getJson("/api/transporte/custos/rotas/{$ca['rota']}")->assertNotFound();
        $this->assertSame(0, $this->como($gb, $b)->getJson('/api/transporte/custos/relatorio?ano=2026')->json('data.totais.rotas'));
    }
}

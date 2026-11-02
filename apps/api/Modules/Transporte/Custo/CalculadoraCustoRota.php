<?php

declare(strict_types=1);

namespace Modules\Transporte\Custo;

/**
 * Cálculo do custo de uma rota (design D-C1 a D-C3). Função pura: recebe os dados e os parâmetros e devolve cada
 * componente. Modelo de custos de transporte escolar no estilo do FNDE/GEIPOT, como o SETE o aplica, com as constantes
 * do calendário como parâmetros nomeados. **Ainda não foi validado contra uma planilha oficial** (design D-C2).
 *
 * Fixo mensal por veículo = pessoal + administrativo + depreciação + remuneração do capital + seguro (+ manutenção, no
 * aquaviário). Variável por km = combustível + lubrificantes (+ rodagem e peças, no rodoviário).
 */
final class CalculadoraCustoRota
{
    /**
     * @param 'rod'|'aqua' $escopo
     * @param array<string, float> $p valores por chave (sem os padrões: quem chama os aplica)
     * @return array{completo: bool, faltando: list<array{chave: string, rotulo: string}>, km_viagem: float, km_mes: float, km_ano: float, alunos: int, fixo: array<string, float>, variavel: array<string, float>, custo_fixo_mensal: float|null, custo_variavel_km: float|null, custo_mensal: float|null, custo_anual: float|null, custo_por_km: float|null, custo_por_dia_letivo: float|null, custo_por_aluno_mes: float|null, custo_por_aluno_ano: float|null}
     */
    public static function calcular(string $escopo, array $p, float $kmViagem, int $alunos, ?int $idadeVeiculo): array
    {
        $faltando = self::faltando($escopo, $p, $kmViagem, $idadeVeiculo);
        $viagens = $p['viagens_por_dia'] ?? 0.0;
        $dias = $p['dias_letivos_mes'] ?? 0.0;
        $meses = $p['meses_letivos'] ?? 0.0;
        $kmMes = $kmViagem * $viagens * $dias;
        $kmAno = $kmMes * $meses;

        $base = [
            'completo' => $faltando === [], 'faltando' => $faltando, 'km_viagem' => $kmViagem, 'km_mes' => $kmMes, 'km_ano' => $kmAno, 'alunos' => $alunos,
            'fixo' => [], 'variavel' => [], 'custo_fixo_mensal' => null, 'custo_variavel_km' => null, 'custo_mensal' => null, 'custo_anual' => null,
            'custo_por_km' => null, 'custo_por_dia_letivo' => null, 'custo_por_aluno_mes' => null, 'custo_por_aluno_ano' => null,
        ];
        if ($faltando !== []) {
            return $base;
        }

        $v = static fn (string $chave): float => $p[$escopo . '_' . $chave] ?? 0.0;
        $c = static fn (string $chave): float => $p[$chave] ?? 0.0;

        $encargos = 1 + $c('encargos_sociais_pct') / 100;
        $pessoal = ($c('salario_motorista') * $c('motoristas_por_veiculo') + $c('salario_monitor') * $c('monitores_por_veiculo')) * $encargos;
        $administrativo = $pessoal * $c('custo_administrativo_pct') / 100;

        $preco = $v('preco_veiculo');
        $n = $v('vida_util_anos');
        $residual = $v('valor_residual_pct') / 100;
        $idade = min(max(0, (int) $idadeVeiculo), (int) $n);
        $coefDepreciacao = (max(0.0, $n - $idade) / ($n * ($n + 1) / 2)) * (1 - $residual);
        $depreciacao = $coefDepreciacao * $preco / 12;
        $capitalMedio = $preco * ((($n + 1) / (2 * $n)) * (1 - $residual) + $residual);
        $remuneracao = $capitalMedio * $c('taxa_remuneracao_pct') / 100 / 12;
        $seguro = $v('seguro_anual') / 12;

        $fixo = ['pessoal' => $pessoal, 'administrativo' => $administrativo, 'depreciacao' => $depreciacao, 'remuneracao_capital' => $remuneracao, 'seguro' => $seguro];
        if ($escopo === 'aqua') {
            $fixo['manutencao'] = $preco * $v('manutencao_anual_pct') / 100 / 12;
        }

        $combustivel = $c('preco_combustivel') / $v('rendimento_km_l');
        $variavel = ['combustivel' => $combustivel, 'lubrificantes' => $v('coef_oleo') * $c('preco_combustivel')];
        if ($escopo === 'rod') {
            $variavel['rodagem'] = ($v('n_pneus') * $v('preco_pneu') + $v('n_pneus') * $v('preco_recapagem') * $v('n_recapagens')) / $v('vida_util_pneu_km');
            $variavel['pecas'] = $kmAno > 0 ? $v('coef_pecas_anual') * $preco / $kmAno : 0.0;
        }

        $fixoMensal = array_sum($fixo);
        $variavelKm = array_sum($variavel);
        $anual = $fixoMensal * $c('meses_custo_fixo') + $variavelKm * $kmAno;
        $mensal = $fixoMensal + $variavelKm * $kmMes;
        $diasAno = $dias * $meses;

        return [
            ...$base,
            'fixo' => array_map(self::arredondar(...), $fixo), 'variavel' => array_map(static fn (float $x): float => round($x, 4), $variavel),
            'custo_fixo_mensal' => self::arredondar($fixoMensal), 'custo_variavel_km' => round($variavelKm, 4),
            'custo_mensal' => self::arredondar($mensal), 'custo_anual' => self::arredondar($anual),
            'custo_por_km' => $kmAno > 0 ? self::arredondar($anual / $kmAno) : null,
            'custo_por_dia_letivo' => $diasAno > 0 ? self::arredondar($anual / $diasAno) : null,
            'custo_por_aluno_mes' => $alunos > 0 ? self::arredondar($mensal / $alunos) : null,
            'custo_por_aluno_ano' => $alunos > 0 ? self::arredondar($anual / $alunos) : null,
        ];
    }

    /**
     * @param array<string, float> $p
     * @return list<array{chave: string, rotulo: string}>
     */
    private static function faltando(string $escopo, array $p, float $kmViagem, ?int $idadeVeiculo): array
    {
        $lista = [];
        foreach (Parametros::todos() as $def) {
            $vale = $def['escopo'] === 'comum' || $def['escopo'] === $escopo;
            if ($vale && $def['obrigatorio'] && !array_key_exists($def['chave'], $p)) {
                $lista[] = ['chave' => $def['chave'], 'rotulo' => $def['rotulo']];
            }
        }
        if ($kmViagem <= 0) {
            $lista[] = ['chave' => 'km_rota', 'rotulo' => 'Quilometragem do percurso da rota'];
        }
        if ($idadeVeiculo === null) {
            $lista[] = ['chave' => 'ano_fabricacao', 'rotulo' => 'Ano de fabricação do veículo'];
        }

        return $lista;
    }

    private static function arredondar(float $valor): float
    {
        return round($valor, 2);
    }
}

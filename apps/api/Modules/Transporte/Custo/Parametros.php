<?php

declare(strict_types=1);

namespace Modules\Transporte\Custo;

/**
 * Catálogo dos parâmetros do cálculo de custo (design D-C4). A fórmula é fixa; o órgão só informa valores. Não há valor
 * de referência para salário, preço ou consumo: são dados do órgão, e o cálculo fica "incompleto" até que sejam
 * informados. Só as constantes estruturais do calendário escolar têm valor inicial.
 *
 * `escopo`: comum | rod (rodoviário) | aqua (aquaviário). `obrigatorio` vale para o modal do escopo (ou ambos, no comum).
 */
final class Parametros
{
    public const GRUPOS = [
        'calendario' => 'Calendário e percurso',
        'pessoal' => 'Pessoal',
        'capital' => 'Capital e depreciação',
        'combustivel' => 'Combustível e lubrificantes',
        'rodagem' => 'Rodagem e peças',
        'contrato' => 'Contrato',
    ];

    /**
     * @return list<array{chave: string, rotulo: string, unidade: string, escopo: string, grupo: string, min: float, max: float, obrigatorio: bool, padrao: float|null, ajuda: string}>
     */
    public static function todos(): array
    {
        $rod = fn (string $chave, string $rotulo, string $unidade, string $grupo, float $min, float $max, bool $obrigatorio, string $ajuda, ?float $padrao = null): array
            => self::p('rod_' . $chave, $rotulo, $unidade, 'rod', $grupo, $min, $max, $obrigatorio, $ajuda, $padrao);
        $aqua = fn (string $chave, string $rotulo, string $unidade, string $grupo, float $min, float $max, bool $obrigatorio, string $ajuda, ?float $padrao = null): array
            => self::p('aqua_' . $chave, $rotulo, $unidade, 'aqua', $grupo, $min, $max, $obrigatorio, $ajuda, $padrao);

        return [
            self::p('dias_letivos_mes', 'Dias letivos por mês', 'dias', 'comum', 'calendario', 1, 31, true, 'Dias de operação da rota em um mês letivo.', 20),
            self::p('meses_letivos', 'Meses letivos no ano', 'meses', 'comum', 'calendario', 1, 12, true, 'Meses do ano em que a rota roda.', 10),
            self::p('viagens_por_dia', 'Viagens por dia', 'viagens', 'comum', 'calendario', 1, 12, true, 'Percursos completos por dia (2 = ida e volta). O km da rota é o de um percurso.', 2),
            self::p('meses_custo_fixo', 'Meses de custo fixo no ano', 'meses', 'comum', 'calendario', 1, 12, true, 'O custo fixo (pessoal, depreciação etc.) corre o ano todo; o variável, só nos dias de operação.', 12),
            self::p('salario_motorista', 'Salário médio do motorista', 'R$/mês', 'comum', 'pessoal', 0, 1000000, true, 'Salário base mensal, sem encargos.'),
            self::p('motoristas_por_veiculo', 'Motoristas por veículo', 'motoristas', 'comum', 'pessoal', 0, 10, true, 'Coeficiente de utilização (motoristas ÷ veículos).', 1),
            self::p('salario_monitor', 'Salário médio do monitor', 'R$/mês', 'comum', 'pessoal', 0, 1000000, false, 'Deixe vazio se a rota não tem monitor.'),
            self::p('monitores_por_veiculo', 'Monitores por veículo', 'monitores', 'comum', 'pessoal', 0, 10, false, 'Coeficiente de utilização (monitores ÷ veículos).', 0),
            self::p('encargos_sociais_pct', 'Encargos sociais', '%', 'comum', 'pessoal', 0, 300, true, 'Percentual sobre os salários.'),
            self::p('custo_administrativo_pct', 'Custo administrativo', '%', 'comum', 'pessoal', 0, 100, false, 'Percentual sobre o custo de pessoal.', 0),
            self::p('taxa_remuneracao_pct', 'Taxa de remuneração do capital', '% ao ano', 'comum', 'capital', 0, 100, true, 'Custo de oportunidade do capital investido no veículo.'),
            self::p('preco_combustivel', 'Preço do combustível', 'R$/litro', 'comum', 'combustivel', 0, 1000, true, 'Preço médio do litro no ano.'),
            self::p('contrato_limite_pct', 'Limite de alerta do contrato', '%', 'comum', 'contrato', 0, 1000, false, 'Sinaliza o contrato que excede o custo estimado acima deste percentual.', 10),

            $rod('preco_veiculo', 'Preço do veículo novo', 'R$', 'capital', 0, 100000000, true, 'Base da depreciação, da remuneração e das peças.'),
            $rod('vida_util_anos', 'Vida útil do veículo', 'anos', 'capital', 1, 50, true, 'Depreciação pelo método da soma dos dígitos dos anos.'),
            $rod('valor_residual_pct', 'Valor residual', '%', 'capital', 0, 100, true, 'Percentual do preço que o veículo ainda vale no fim da vida útil.'),
            $rod('seguro_anual', 'Seguro, licenciamento e IPVA', 'R$/ano', 'capital', 0, 100000000, false, 'Custo anual somado ao fixo.', 0),
            $rod('rendimento_km_l', 'Rendimento do veículo', 'km/litro', 'combustivel', 0.01, 1000, true, 'Quilômetros rodados por litro.'),
            $rod('coef_oleo', 'Coeficiente de óleo e lubrificantes', 'litros/km', 'combustivel', 0, 10, false, 'Litros de lubrificante por km, ao preço do combustível.', 0),
            $rod('n_pneus', 'Pneus por veículo', 'pneus', 'rodagem', 1, 50, true, 'Quantidade de pneus em rodagem.'),
            $rod('preco_pneu', 'Preço do pneu novo', 'R$', 'rodagem', 0, 1000000, true, ''),
            $rod('preco_recapagem', 'Preço da recapagem', 'R$', 'rodagem', 0, 1000000, false, 'Deixe vazio se não há recapagem.', 0),
            $rod('n_recapagens', 'Recapagens por pneu', 'recapagens', 'rodagem', 0, 10, false, '', 0),
            $rod('vida_util_pneu_km', 'Vida útil do pneu', 'km', 'rodagem', 1, 10000000, true, 'Quilômetros até o pneu ser descartado (somadas as recapagens).'),
            $rod('coef_pecas_anual', 'Peças e acessórios', 'fração do preço/ano', 'rodagem', 0, 10, false, 'Fração do preço do veículo gasta por ano em peças (0,05 = 5 %).', 0),

            $aqua('preco_veiculo', 'Preço da embarcação nova', 'R$', 'capital', 0, 100000000, true, 'Base da depreciação, da remuneração e da manutenção.'),
            $aqua('vida_util_anos', 'Vida útil da embarcação', 'anos', 'capital', 1, 80, true, 'Depreciação pelo método da soma dos dígitos dos anos.'),
            $aqua('valor_residual_pct', 'Valor residual', '%', 'capital', 0, 100, true, ''),
            $aqua('seguro_anual', 'Seguro e licenciamento', 'R$/ano', 'capital', 0, 100000000, false, '', 0),
            $aqua('manutencao_anual_pct', 'Manutenção anual', '% do preço', 'capital', 0, 100, false, 'Percentual do preço da embarcação gasto por ano em manutenção.', 0),
            $aqua('rendimento_km_l', 'Rendimento da embarcação', 'km/litro', 'combustivel', 0.01, 1000, true, 'Quilômetros navegados por litro.'),
            $aqua('coef_oleo', 'Coeficiente de óleo e lubrificantes', 'litros/km', 'combustivel', 0, 10, false, '', 0),
        ];
    }

    /** @return array<string, array{chave: string, rotulo: string, unidade: string, escopo: string, grupo: string, min: float, max: float, obrigatorio: bool, padrao: float|null, ajuda: string}> */
    public static function porChave(): array
    {
        $mapa = [];
        foreach (self::todos() as $p) {
            $mapa[$p['chave']] = $p;
        }

        return $mapa;
    }

    /** @return array{chave: string, rotulo: string, unidade: string, escopo: string, grupo: string, min: float, max: float, obrigatorio: bool, padrao: float|null, ajuda: string} */
    private static function p(string $chave, string $rotulo, string $unidade, string $escopo, string $grupo, float $min, float $max, bool $obrigatorio, string $ajuda, ?float $padrao = null): array
    {
        return ['chave' => $chave, 'rotulo' => $rotulo, 'unidade' => $unidade, 'escopo' => $escopo, 'grupo' => $grupo, 'min' => $min, 'max' => $max, 'obrigatorio' => $obrigatorio, 'padrao' => $padrao, 'ajuda' => $ajuda];
    }
}

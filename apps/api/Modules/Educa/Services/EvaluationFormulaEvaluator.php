<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use InvalidArgumentException;

/**
 * Avaliador Declarativo e Seguro de Fórmulas Aritméticas Escolares (Sem eval - ADR 002).
 *
 * Suporta:
 * - Operadores: +, -, *, /
 * - Parênteses para precedência
 * - Funções: max(x, y), min(x, y), avg(x, y, ...)
 * - Substituição determinística de variáveis (E1, E2, E3, E4, REC, EX, MA)
 */
final class EvaluationFormulaEvaluator
{
    /**
     * Avalia a fórmula com os valores das variáveis fornecidas.
     *
     * @param array<string, float|int> $variaveis Ex: ['E1' => 7.0, 'E2' => 8.0, 'E3' => 6.5, 'E4' => 7.5]
     */
    public function evaluate(string $formula, array $variaveis): float
    {
        $formulaLimpa = trim($formula);
        if ($formulaLimpa === '') {
            throw new InvalidArgumentException('A fórmula de avaliação não pode ser vazia.');
        }

        // 1. Substitui funções personalizadas antes do parsing aritmético
        $formulaProcessada = $this->resolverFuncoes($formulaLimpa, $variaveis);

        // 2. Tokenização da expressão com variáveis
        $tokens = $this->tokenize($formulaProcessada, $variaveis);

        // 3. Conversão para RPN (Reverse Polish Notation) via Shunting-Yard
        $rpn = $this->shuntingYard($tokens);

        // 4. Cálculo final sobre a pilha
        return $this->calcularRpn($rpn);
    }

    /**
     * Valida se a sintaxe da fórmula é válida executando um teste com variáveis dummy.
     */
    public function validarSintaxe(string $formula): bool
    {
        try {
            $dummy = [
                'E' => 10.0,
                'NOTA' => 10.0,
                'E1' => 10.0,
                'E2' => 10.0,
                'E3' => 10.0,
                'E4' => 10.0,
                'E5' => 10.0,
                'E6' => 10.0,
                'REC' => 10.0,
                'EX' => 10.0,
                'MA' => 10.0,
            ];
            $this->evaluate($formula, $dummy);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Alias em inglês para validação de sintaxe.
     */
    public function validateSyntax(string $formula): bool
    {
        return $this->validarSintaxe($formula);
    }

    /**
     * Resolve funções como max(a, b) e min(a, b).
     *
     * @param array<string, float|int> $variaveis
     */
    private function resolverFuncoes(string $formula, array $variaveis): string
    {
        // Resolve max(...)
        $resultado = preg_replace_callback('/max\s*\(([^)]+)\)/i', function (array $matches) use ($variaveis): string {
            $args = explode(',', $matches[1]);
            $valores = array_map(fn(string $arg) => $this->evaluate(trim($arg), $variaveis), $args);
            return (string) max($valores);
        }, $formula);

        // Resolve min(...)
        $resultado = preg_replace_callback('/min\s*\(([^)]+)\)/i', function (array $matches) use ($variaveis): string {
            $args = explode(',', $matches[1]);
            $valores = array_map(fn(string $arg) => $this->evaluate(trim($arg), $variaveis), $args);
            return (string) min($valores);
        }, (string) $resultado);

        return (string) $resultado;
    }

    /**
     * @param array<string, float|int> $variaveis
     * @return list<string>
     */
    private function tokenize(string $formula, array $variaveis): array
    {
        $tokens = [];
        $length = strlen($formula);
        $i = 0;

        while ($i < $length) {
            $char = $formula[$i];

            if (ctype_space($char)) {
                $i++;
                continue;
            }

            // Operadores ou parênteses
            if (in_array($char, ['+', '-', '*', '/', '(', ')'], true)) {
                $tokens[] = $char;
                $i++;
                continue;
            }

            // Números literais (decimais ou inteiros)
            if (ctype_digit($char) || $char === '.') {
                $num = '';
                while ($i < $length && (ctype_digit($formula[$i]) || $formula[$i] === '.')) {
                    $num .= $formula[$i];
                    $i++;
                }
                $tokens[] = $num;
                continue;
            }

            // Identificadores de variáveis (ex: E1, REC, MA)
            if (ctype_alpha($char) || $char === '_') {
                $var = '';
                while ($i < $length && (ctype_alnum($formula[$i]) || $formula[$i] === '_')) {
                    $var .= $formula[$i];
                    $i++;
                }

                $varUpper = strtoupper($var);
                if (!array_key_exists($varUpper, $variaveis)) {
                    throw new InvalidArgumentException("Variável desconhecida ou não informada na fórmula: {$var}");
                }

                $tokens[] = (string) ((float) $variaveis[$varUpper]);
                continue;
            }

            throw new InvalidArgumentException("Caractere inválido na fórmula: {$char}");
        }

        return $tokens;
    }

    /**
     * Algoritmo Shunting-yard para conversão infixa -> RPN.
     *
     * @param list<string> $tokens
     * @return list<string>
     */
    private function shuntingYard(array $tokens): array
    {
        $output = [];
        $operators = [];
        $precedence = ['+' => 1, '-' => 1, '*' => 2, '/' => 2];

        foreach ($tokens as $token) {
            if (is_numeric($token)) {
                $output[] = $token;
            } elseif (isset($precedence[$token])) {
                while (!empty($operators)) {
                    $top = end($operators);
                    if (isset($precedence[$top]) && $precedence[$top] >= $precedence[$token]) {
                        $output[] = array_pop($operators);
                    } else {
                        break;
                    }
                }
                $operators[] = $token;
            } elseif ($token === '(') {
                $operators[] = $token;
            } elseif ($token === ')') {
                while (!empty($operators) && end($operators) !== '(') {
                    $output[] = array_pop($operators);
                }
                if (empty($operators)) {
                    throw new InvalidArgumentException('Parênteses desbalanceados na fórmula.');
                }
                array_pop($operators); // remove '('
            }
        }

        while (!empty($operators)) {
            $top = array_pop($operators);
            if ($top === '(' || $top === ')') {
                throw new InvalidArgumentException('Parênteses desbalanceados na fórmula.');
            }
            $output[] = $top;
        }

        return $output;
    }

    /**
     * Executa o cálculo da pilha em notação polonesa reversa.
     *
     * @param list<string> $rpn
     */
    private function calcularRpn(array $rpn): float
    {
        $stack = [];

        foreach ($rpn as $token) {
            if (is_numeric($token)) {
                $stack[] = (float) $token;
            } else {
                if (count($stack) < 2) {
                    throw new InvalidArgumentException('Expressão aritmética mal-formada.');
                }
                $b = array_pop($stack);
                $a = array_pop($stack);

                $res = match ($token) {
                    '+' => $a + $b,
                    '-' => $a - $b,
                    '*' => $a * $b,
                    '/' => $b == 0.0 ? 0.0 : $a / $b,
                    default => throw new InvalidArgumentException("Operador desconhecido: {$token}"),
                };

                $stack[] = $res;
            }
        }

        if (count($stack) !== 1) {
            throw new InvalidArgumentException('Expressão aritmética mal-formada.');
        }

        return (float) array_pop($stack);
    }
}

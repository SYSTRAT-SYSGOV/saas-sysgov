<?php

declare(strict_types=1);

namespace Modules\Pessoas\Support;

/**
 * Documento de identificação de pessoa física (CPF) ou jurídica (CNPJ): validação de
 * dígito verificador, hash para unicidade e máscara — CPF e CNPJ nunca têm a mesma
 * quantidade de dígitos (11 vs. 14), por isso a máscara pode inferir o formato pela
 * contagem de dígitos, mas a validação recebe o tipo explicitamente.
 */
final class Documento
{
    public static function somenteDigitos(string $valor): string
    {
        return (string) preg_replace('/\D/', '', $valor);
    }

    public static function hash(string $valor): string
    {
        return hash_hmac('sha256', self::somenteDigitos($valor), (string) config('pessoas.hash_key'));
    }

    /** @param 'fisica'|'juridica' $tipo */
    public static function valido(string $valor, string $tipo = 'fisica'): bool
    {
        return $tipo === 'juridica' ? self::cnpjValido($valor) : self::cpfValido($valor);
    }

    private static function cpfValido(string $valor): bool
    {
        $d = self::somenteDigitos($valor);

        if (strlen($d) !== 11 || preg_match('/^(\d)\1{10}$/', $d)) {
            return false;
        }

        for ($t = 9; $t < 11; $t++) {
            $soma = 0;
            for ($i = 0; $i < $t; $i++) {
                $soma += (int) $d[$i] * (($t + 1) - $i);
            }
            if ((int) $d[$t] !== ((10 * $soma) % 11) % 10) {
                return false;
            }
        }

        return true;
    }

    private static function cnpjValido(string $valor): bool
    {
        $d = self::somenteDigitos($valor);

        if (strlen($d) !== 14 || preg_match('/^(\d)\1{13}$/', $d)) {
            return false;
        }

        $pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        $calcularDigito = function (array $digitos, array $pesos): int {
            $soma = 0;
            foreach ($pesos as $i => $peso) {
                $soma += (int) $digitos[$i] * $peso;
            }
            $resto = $soma % 11;

            return $resto < 2 ? 0 : 11 - $resto;
        };

        $digitosBase = str_split(substr($d, 0, 12));
        $digito1 = $calcularDigito($digitosBase, $pesos1);
        if ((int) $d[12] !== $digito1) {
            return false;
        }

        $digitosComPrimeiro = [...$digitosBase, (string) $digito1];
        $digito2 = $calcularDigito($digitosComPrimeiro, $pesos2);

        return (int) $d[13] === $digito2;
    }

    /** Tipo de pessoa pelo tamanho do documento (11 dígitos = CPF, 14 = CNPJ); `null` para qualquer outro. */
    public static function tipoPorDigitos(string $valor): ?string
    {
        return match (strlen(self::somenteDigitos($valor))) {
            11 => 'fisica',
            14 => 'juridica',
            default => null,
        };
    }

    /** CPF (11 dígitos) ou CNPJ (14 dígitos) válido, escolhido pelo tamanho do documento. */
    public static function validoPorTamanho(string $valor): bool
    {
        $tipo = self::tipoPorDigitos($valor);

        return $tipo !== null && self::valido($valor, $tipo);
    }

    /** Formatação completa, sem ocultar dígitos: `529.982.247-25` ou `11.222.333/0001-81`. */
    public static function formatar(string $valor): string
    {
        $d = self::somenteDigitos($valor);

        return match (strlen($d)) {
            11 => substr($d, 0, 3) . '.' . substr($d, 3, 3) . '.' . substr($d, 6, 3) . '-' . substr($d, 9, 2),
            14 => substr($d, 0, 2) . '.' . substr($d, 2, 3) . '.' . substr($d, 5, 3) . '/' . substr($d, 8, 4) . '-' . substr($d, 12, 2),
            default => $d,
        };
    }

    /** Ex.: `***.456.789-**` para CPF (11 dígitos) ou `00.000.000/0000-00` para CNPJ (14 dígitos). */
    public static function mascarar(string $valor): string
    {
        $d = self::somenteDigitos($valor);

        if (strlen($d) === 14) {
            return substr($d, 0, 2) . '.' . substr($d, 2, 3) . '.' . substr($d, 5, 3)
                . '/' . substr($d, 8, 4) . '-' . substr($d, 12, 2);
        }

        return '***.' . substr($d, 3, 3) . '.' . substr($d, 6, 3) . '-**';
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/** CPF/CNPJ: validação de dígito verificador, hash para busca/unicidade e máscara (RN-05). */
final class Documento
{
    public static function somenteDigitos(string $valor): string
    {
        return (string) preg_replace('/\D/', '', $valor);
    }

    public static function hash(string $valor): string
    {
        return hash_hmac('sha256', self::somenteDigitos($valor), (string) config('cemiterios.hash_key'));
    }

    public static function valido(string $valor): bool
    {
        $d = self::somenteDigitos($valor);

        return match (strlen($d)) {
            11 => self::cpfValido($d),
            14 => self::cnpjValido($d),
            default => false,
        };
    }

    public static function tipo(string $valor): string
    {
        return strlen(self::somenteDigitos($valor)) === 14 ? 'cnpj' : 'cpf';
    }

    /** Ex.: ***.456.789-** (CPF) ou **.345.678/0001-** (CNPJ). */
    public static function mascarar(string $valor): string
    {
        $d = self::somenteDigitos($valor);

        if (strlen($d) === 14) {
            return '**.' . substr($d, 2, 3) . '.' . substr($d, 5, 3) . '/' . substr($d, 8, 4) . '-**';
        }

        return '***.' . substr($d, 3, 3) . '.' . substr($d, 6, 3) . '-**';
    }

    private static function cpfValido(string $d): bool
    {
        if (preg_match('/^(\d)\1{10}$/', $d)) {
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

    private static function cnpjValido(string $d): bool
    {
        if (preg_match('/^(\d)\1{13}$/', $d)) {
            return false;
        }

        foreach ([12, 13] as $t) {
            $pesos = $t === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
            $soma = 0;
            for ($i = 0; $i < $t; $i++) {
                $soma += (int) $d[$i] * $pesos[$i];
            }
            $resto = $soma % 11;
            if ((int) $d[$t] !== ($resto < 2 ? 0 : 11 - $resto)) {
                return false;
            }
        }

        return true;
    }
}

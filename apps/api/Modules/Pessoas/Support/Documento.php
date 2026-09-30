<?php

declare(strict_types=1);

namespace Modules\Pessoas\Support;

/** CPF de pessoa física: validação de dígito verificador, hash para unicidade e máscara. */
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

    public static function valido(string $valor): bool
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

    /** Ex.: ***.456.789-** */
    public static function mascarar(string $valor): string
    {
        $d = self::somenteDigitos($valor);

        return '***.' . substr($d, 3, 3) . '.' . substr($d, 6, 3) . '-**';
    }
}

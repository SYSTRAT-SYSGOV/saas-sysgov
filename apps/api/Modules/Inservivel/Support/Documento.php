<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Modules\Pessoas\Services\ResolucaoPessoaService;

/** CPF e CNPJ das entidades: só dígitos, validação dos dígitos verificadores e formatação. */
final class Documento
{
    public static function digitos(?string $valor): string
    {
        return (string) preg_replace('/\D/', '', (string) $valor);
    }

    public static function cpfValido(?string $valor): bool
    {
        $d = self::digitos($valor);

        return strlen($d) === 11 && ResolucaoPessoaService::cpfValido($d);
    }

    public static function cnpjValido(?string $valor): bool
    {
        $d = self::digitos($valor);
        if (strlen($d) !== 14 || preg_match('/^(\d)\1{13}$/', $d)) {
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

    public static function formatarCnpj(?string $valor): string
    {
        $d = self::digitos($valor);

        return strlen($d) === 14
            ? substr($d, 0, 2) . '.' . substr($d, 2, 3) . '.' . substr($d, 5, 3) . '/' . substr($d, 8, 4) . '-' . substr($d, 12, 2)
            : $d;
    }
}

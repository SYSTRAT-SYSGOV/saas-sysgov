<?php

declare(strict_types=1);

namespace Modules\Campanha\Support;

use Modules\Pessoas\Services\ResolucaoPessoaService;

/** CPF ou CNPJ de doador/fornecedor (D4): só dígitos, validação (CPF pelo Cadastro de Pessoas) e máscara. */
final class Documento
{
    public static function digitos(?string $valor): string
    {
        return (string) preg_replace('/\D/', '', (string) $valor);
    }

    public static function valido(?string $valor): bool
    {
        $d = self::digitos($valor);

        return match (strlen($d)) {
            11 => ResolucaoPessoaService::cpfValido($d),
            14 => self::cnpjValido($d),
            default => false,
        };
    }

    /** Ex.: 529.982.247-25 ou 11.222.333/0001-81 (para a planilha da prestação de contas). */
    public static function formatar(?string $valor): string
    {
        $d = self::digitos($valor);

        return match (strlen($d)) {
            11 => substr($d, 0, 3) . '.' . substr($d, 3, 3) . '.' . substr($d, 6, 3) . '-' . substr($d, 9, 2),
            14 => substr($d, 0, 2) . '.' . substr($d, 2, 3) . '.' . substr($d, 5, 3) . '/' . substr($d, 8, 4) . '-' . substr($d, 12, 2),
            default => $d,
        };
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

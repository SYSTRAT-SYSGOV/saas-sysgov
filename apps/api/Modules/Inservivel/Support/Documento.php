<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Modules\Pessoas\Support\Documento as DocumentoPessoa;

/** CPF e CNPJ das entidades: delega validação e formatação ao Cadastro de Pessoas. */
final class Documento
{
    public static function digitos(?string $valor): string
    {
        return DocumentoPessoa::somenteDigitos((string) $valor);
    }

    public static function cpfValido(?string $valor): bool
    {
        return DocumentoPessoa::valido((string) $valor, 'fisica');
    }

    public static function cnpjValido(?string $valor): bool
    {
        return DocumentoPessoa::valido((string) $valor, 'juridica');
    }

    public static function formatarCnpj(?string $valor): string
    {
        return strlen(self::digitos($valor)) === 14 ? DocumentoPessoa::formatar((string) $valor) : self::digitos($valor);
    }
}

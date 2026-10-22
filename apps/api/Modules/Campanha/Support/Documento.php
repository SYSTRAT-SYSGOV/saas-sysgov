<?php

declare(strict_types=1);

namespace Modules\Campanha\Support;

use Modules\Pessoas\Support\Documento as DocumentoPessoa;

/** CPF ou CNPJ de doador/fornecedor (D4): delega validação e formatação ao Cadastro de Pessoas. */
final class Documento
{
    public static function digitos(?string $valor): string
    {
        return DocumentoPessoa::somenteDigitos((string) $valor);
    }

    public static function valido(?string $valor): bool
    {
        return DocumentoPessoa::validoPorTamanho((string) $valor);
    }

    /** Ex.: 529.982.247-25 ou 11.222.333/0001-81 (para a planilha da prestação de contas). */
    public static function formatar(?string $valor): string
    {
        return DocumentoPessoa::formatar((string) $valor);
    }
}

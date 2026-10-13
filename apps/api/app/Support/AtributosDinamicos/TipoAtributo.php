<?php

declare(strict_types=1);

namespace App\Support\AtributosDinamicos;

enum TipoAtributo: string
{
    case NUMERICO = 'numerico';
    case TEXTO = 'texto';
    case LISTA = 'lista';
    case LISTA_MULTIPLA = 'lista_multipla';
    case DATA = 'data';
    case DECIMAL = 'decimal';
    case TEXTO_LONGO = 'texto_longo';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $tipo) => $tipo->value, self::cases());
    }
}

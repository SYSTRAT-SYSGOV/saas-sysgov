<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/** Tipos de documentos de sucessão. */
enum TipoDocumentoSucessao: string
{
    case CertidaoObito = 'certidao_obito';
    case Inventario = 'inventario';
    case FormalPartilha = 'formal_partilha';
    case Escritura = 'escritura';
    case Alvará = 'alvara';
    case Procuracao = 'procuracao';
    case Outro = 'outro';
}
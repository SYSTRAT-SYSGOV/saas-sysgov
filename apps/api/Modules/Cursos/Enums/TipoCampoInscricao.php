<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum TipoCampoInscricao: string
{
    case Texto = 'texto';
    case TextoLongo = 'texto_longo';
    case Numero = 'numero';
    case Data = 'data';
    case Selecao = 'selecao';
    case CaixaMarcacao = 'caixa_marcacao';

    public function label(): string
    {
        return match ($this) {
            self::Texto => 'Texto',
            self::TextoLongo => 'Texto longo',
            self::Numero => 'Número',
            self::Data => 'Data',
            self::Selecao => 'Seleção',
            self::CaixaMarcacao => 'Caixa de marcação',
        };
    }

    public function is(self ...$tipos): bool
    {
        return in_array($this, $tipos, true);
    }
}

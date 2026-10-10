<?php

declare(strict_types=1);

namespace Modules\Escola\Enums;

enum SituacaoAluno: string
{
    case Ativo = 'ativo';
    case Transferido = 'transferido';
    case Remanejado = 'remanejado';

    public function label(): string
    {
        return match ($this) {
            self::Ativo => 'Ativo',
            self::Transferido => 'Transferido',
            self::Remanejado => 'Remanejado',
        };
    }
}

<?php

declare(strict_types=1);

namespace Modules\Licita\Enums;

enum StatusProcesso: string
{
    case EmAndamento = 'em_andamento';
    case Concluido = 'concluido';
    case Cancelado = 'cancelado';

    public function label(): string
    {
        return match ($this) {
            self::EmAndamento => 'Em Andamento',
            self::Concluido => 'Concluído',
            self::Cancelado => 'Cancelado',
        };
    }
}

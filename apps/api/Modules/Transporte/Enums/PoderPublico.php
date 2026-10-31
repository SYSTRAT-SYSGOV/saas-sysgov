<?php

declare(strict_types=1);

namespace Modules\Transporte\Enums;

/** Poder público responsável pelo transporte escolar (códigos do Censo). */
enum PoderPublico: int
{
    case Estadual = 1;
    case Municipal = 2;
    case Compartilhado = 3;

    public function label(): string
    {
        return match ($this) {
            self::Estadual => 'Estadual',
            self::Municipal => 'Municipal',
            self::Compartilhado => 'Compartilhado (estadual e municipal)',
        };
    }
}

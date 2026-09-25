<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum StatusTurma: string
{
    case Aberta = 'aberta';
    case Encerrada = 'encerrada';
    case Cancelada = 'cancelada';

    public function label(): string
    {
        return match ($this) {
            self::Aberta => 'Aberta',
            self::Encerrada => 'Encerrada',
            self::Cancelada => 'Cancelada',
        };
    }

    public function is(self ...$statuses): bool
    {
        return in_array($this, $statuses, true);
    }

    /** aberta -> encerrada|cancelada. Os dois são terminais. */
    public function podeTransicionarPara(self $novo): bool
    {
        return $this === self::Aberta && $novo->is(self::Encerrada, self::Cancelada);
    }
}

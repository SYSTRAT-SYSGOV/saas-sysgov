<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum TipoQuestao: string
{
    case Objetiva = 'objetiva';
    case Dissertativa = 'dissertativa';

    public function label(): string
    {
        return match ($this) {
            self::Objetiva => 'Objetiva',
            self::Dissertativa => 'Dissertativa',
        };
    }

    public function is(self ...$tipos): bool
    {
        return in_array($this, $tipos, true);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum NivelAtencao: string
{
    case Baixo = 'baixo';
    case Medio = 'medio';
    case Alto = 'alto';
}

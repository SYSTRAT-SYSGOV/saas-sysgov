<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum DesempenhoGeral: string
{
    case Excelente = 'excelente';
    case Bom = 'bom';
    case Regular = 'regular';
    case Insatisfatorio = 'insatisfatorio';
}

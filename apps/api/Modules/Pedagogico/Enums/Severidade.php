<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum Severidade: string
{
    case Baixa = 'baixa';
    case Media = 'media';
    case Alta = 'alta';
    case Critica = 'critica';
}

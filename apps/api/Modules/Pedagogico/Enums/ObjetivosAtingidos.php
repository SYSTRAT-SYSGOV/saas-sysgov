<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum ObjetivosAtingidos: string
{
    case Totalmente = 'totalmente';
    case Parcialmente = 'parcialmente';
    case NaoAtingidos = 'nao_atingidos';
}

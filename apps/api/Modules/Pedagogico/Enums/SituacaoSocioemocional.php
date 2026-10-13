<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Enums;

enum SituacaoSocioemocional: string
{
    case Adequado = 'adequado';
    case NecessitaAtencao = 'necessita_atencao';
    case Critico = 'critico';
}

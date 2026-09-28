<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Support;

/** Graus de parentesco para fins sucessórios. */
enum Parentesco: string
{
    case Companheiro = 'companheiro';
    case Filho = 'filho';
    case Pai = 'pai';
    case Mae = 'mae';
    case Irmao = 'irmao';
    case Neto = 'neto';
    case Avo = 'avo';
    case Tio = 'tio';
    case Sobrinho = 'sobrinho';
    case Outro = 'outro';
    case Representante = 'representante';
}
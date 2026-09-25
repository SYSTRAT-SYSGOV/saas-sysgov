<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum TipoCertificado: string
{
    case Curso = 'curso';
    case Formacao = 'formacao';
}

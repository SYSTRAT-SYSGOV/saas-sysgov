<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum TipoCertificado: string
{
    case Curso = 'curso';
    case Formacao = 'formacao';
    /** Emitido à mão pelo Administrador num curso, sem turma nem apuração (D7). */
    case Avulso = 'avulso';
}

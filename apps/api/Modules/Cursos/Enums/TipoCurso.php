<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

/** Evento é um curso de turma única (design D3). */
enum TipoCurso: string
{
    case Curso = 'curso';
    case Evento = 'evento';

    public function label(): string
    {
        return match ($this) {
            self::Curso => 'Curso',
            self::Evento => 'Evento',
        };
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

/** Regra de liberação de materiais e avaliações, avaliada por turma (design D2 da Fase 2). */
enum RegraLiberacao: string
{
    case Imediata = 'imediata';
    case InicioAula = 'inicio_aula';
    case DiasAposInicio = 'dias_apos_inicio';

    public function label(): string
    {
        return match ($this) {
            self::Imediata => 'Imediata',
            self::InicioAula => 'No início da aula',
            self::DiasAposInicio => 'Dias após o início da turma',
        };
    }
}

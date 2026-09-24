<?php

declare(strict_types=1);

namespace Modules\Cursos\Enums;

enum StatusCurso: string
{
    case Rascunho = 'rascunho';
    case Publicado = 'publicado';
    case Encerrado = 'encerrado';

    public function label(): string
    {
        return match ($this) {
            self::Rascunho => 'Rascunho',
            self::Publicado => 'Publicado',
            self::Encerrado => 'Encerrado',
        };
    }

    public function is(self ...$statuses): bool
    {
        return in_array($this, $statuses, true);
    }

    /** rascunho -> publicado -> encerrado. Encerrado é terminal. */
    public function podeTransicionarPara(self $novo): bool
    {
        return match ($this) {
            self::Rascunho => $novo->is(self::Publicado),
            self::Publicado => $novo->is(self::Encerrado),
            self::Encerrado => false,
        };
    }
}

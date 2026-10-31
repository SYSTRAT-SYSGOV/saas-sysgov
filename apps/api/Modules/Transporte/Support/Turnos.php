<?php

declare(strict_types=1);

namespace Modules\Transporte\Support;

use Illuminate\Support\Str;

/** Reconhece o turno pelo nome do turno da turma (cadastro livre no Escola): sem acento, em minúsculas (design D20). */
final class Turnos
{
    /** @return string|null `manha`, `tarde`, `noite`, `integral` ou `null` quando o nome não é reconhecível */
    public static function normalizar(string $nome): ?string
    {
        $n = Str::lower(Str::ascii($nome));

        return match (true) {
            str_contains($n, 'integral') => 'integral',
            str_contains($n, 'manh') => 'manha',
            str_contains($n, 'tard') => 'tarde',
            str_contains($n, 'noit') => 'noite',
            default => null,
        };
    }
}

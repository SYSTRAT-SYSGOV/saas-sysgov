<?php

declare(strict_types=1);

namespace Modules\Escola\Support;

use Illuminate\Support\Str;

/**
 * Forma canônica de nomes para comparação de unicidade sem diferenciar maiúsculas e acentos (design D5).
 */
final class NomeNormalizado
{
    public static function de(string $nome): string
    {
        return Str::of(Str::ascii($nome))->lower()->squish()->toString();
    }
}

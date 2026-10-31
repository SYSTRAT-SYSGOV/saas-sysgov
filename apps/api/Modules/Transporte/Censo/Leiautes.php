<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo;

use DomainException;

/** Leiautes disponíveis. O leiaute oficial do Educacenso entra como mais uma entrada (design D28). */
final class Leiautes
{
    /** @return array<string, Leiaute> */
    public static function todos(): array
    {
        $basico = new LeiauteBasico();

        return [$basico->chave() => $basico];
    }

    public static function padrao(): Leiaute
    {
        return new LeiauteBasico();
    }

    public static function obter(?string $chave): Leiaute
    {
        if ($chave === null || $chave === '') {
            return self::padrao();
        }

        return self::todos()[$chave]
            ?? throw new DomainException("Leiaute \"{$chave}\" não existe. Disponíveis: " . implode(', ', array_keys(self::todos())) . '.');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Portfolio\Support;

/**
 * Avaliação de 0 a 10 com uma casa decimal, guardada em décimos inteiros (8,5 → 85) para evitar float (design D2).
 */
final class Avaliacao
{
    public static function valida(mixed $valor): bool
    {
        if (!is_numeric($valor)) {
            return false;
        }
        $decimos = (float) $valor * 10;

        return $decimos >= 0 && $decimos <= 100 && abs($decimos - round($decimos)) < 1e-6;
    }

    public static function paraDecimos(float|int|string $valor): int
    {
        return (int) round((float) $valor * 10);
    }

    public static function numero(int $decimos): float
    {
        return $decimos / 10;
    }

    /**
     * Média em décimos, meio para cima; null sem avaliações.
     *
     * @param list<int> $decimos
     */
    public static function media(array $decimos): ?int
    {
        $n = count($decimos);

        return $n === 0 ? null : intdiv(2 * array_sum($decimos) + $n, 2 * $n);
    }
}

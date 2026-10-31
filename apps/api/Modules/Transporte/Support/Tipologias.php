<?php

declare(strict_types=1);

namespace Modules\Transporte\Support;

/** Tipologia do veículo no Censo Escolar (Inep), de 1 a 11. */
final class Tipologias
{
    /** @var array<int, string> */
    public const ROTULOS = [
        1 => 'Van / Kombi',
        2 => 'Micro-ônibus',
        3 => 'Ônibus',
        4 => 'Bicicleta',
        5 => 'Tração animal',
        6 => 'Outro',
        7 => 'Aquaviário até 5 alunos',
        8 => 'Aquaviário de 5 a 15 alunos',
        9 => 'Aquaviário de 15 a 35 alunos',
        10 => 'Aquaviário acima de 35 alunos',
        11 => 'Ferroviário (trem / metrô)',
    ];

    /** @return list<array{valor: int, rotulo: string}> */
    public static function lista(): array
    {
        return array_map(fn (int $valor, string $rotulo): array => ['valor' => $valor, 'rotulo' => $rotulo], array_keys(self::ROTULOS), self::ROTULOS);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Transporte\Custo;

/** Características do trecho de uma rota rural (design D-C7). Informativas: não entram na fórmula do custo. */
final class Caracteristicas
{
    public const ROTULOS = [
        'porteira' => 'Porteira',
        'mata_burro' => 'Mata-burro',
        'colchete' => 'Colchete',
        'atoleiro' => 'Trecho com atoleiro',
        'ponte_rustica' => 'Ponte rústica',
    ];

    /** @return list<array{valor: string, rotulo: string}> */
    public static function opcoes(): array
    {
        return array_map(static fn (string $valor, string $rotulo): array => ['valor' => $valor, 'rotulo' => $rotulo], array_keys(self::ROTULOS), self::ROTULOS);
    }
}

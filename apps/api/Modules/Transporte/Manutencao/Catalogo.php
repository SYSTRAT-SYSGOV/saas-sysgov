<?php

declare(strict_types=1);

namespace Modules\Transporte\Manutencao;

/** Catálogos fechados da manutenção (design D-M2 e D-M3). */
final class Catalogo
{
    public const RAMOS = [
        'mecanica' => 'Mecânica',
        'combustivel' => 'Combustível',
        'seguro' => 'Seguro',
        'pecas' => 'Peças',
        'outros' => 'Outros',
    ];

    public const TIPOS_OS = [
        'preventiva' => 'Preventiva',
        'corretiva' => 'Corretiva',
        'revisao' => 'Revisão',
        'pneus' => 'Pneus',
        'combustivel' => 'Combustível',
        'seguro' => 'Seguro',
        'outro' => 'Outro',
    ];

    public const STATUS_OS = ['aberta' => 'Aberta', 'concluida' => 'Concluída', 'cancelada' => 'Cancelada'];

    /** Antecedência do alerta de manutenção prevista por quilometragem (design D-M4). */
    public const KM_ANTECEDENCIA = 500;

    /**
     * @param array<string, string> $mapa
     * @return list<array{valor: string, rotulo: string}>
     */
    public static function opcoes(array $mapa): array
    {
        return array_map(static fn (string $valor, string $rotulo): array => ['valor' => $valor, 'rotulo' => $rotulo], array_keys($mapa), $mapa);
    }
}

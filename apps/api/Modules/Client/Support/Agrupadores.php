<?php

declare(strict_types=1);

namespace Modules\Client\Support;

use Illuminate\Support\Str;

/**
 * Agrupadores do menu do cliente: itens raiz sem módulo e sem permissão, que só existem para reunir submódulos
 * (change educacao-modulo-submodulos). O `module.json` do submódulo aponta para o agrupador em `menu.parent`.
 */
final class Agrupadores
{
    /** @var array<string, array{label: string, icon: string, order: int}> */
    private const CATALOGO = [
        'educacao' => ['label' => 'Educação', 'icon' => 'GraduationCap', 'order' => 29],
    ];

    /** @return array{label: string, icon: string, order: int} */
    public static function dados(string $alias): array
    {
        return self::CATALOGO[$alias] ?? ['label' => Str::headline($alias), 'icon' => 'Layers', 'order' => 50];
    }

    public static function rota(string $alias): string
    {
        return '/' . ltrim($alias, '/');
    }

    public static function rotaDoSubmodulo(string $agrupador, string $slug): string
    {
        return self::rota($agrupador) . '/' . ltrim($slug, '/');
    }

    /**
     * Submódulos da Educação: alias do módulo => [slug da rota, rótulo]. Usado pela migração do menu, que não pode
     * depender do module.json (o arquivo muda; a migração, não).
     *
     * @return array<string, array{0: string, 1: string}>
     */
    public static function submodulosDaEducacao(): array
    {
        return [
            'escola' => ['cadastro-escolar', 'Cadastro Escolar'],
            'pedagogico' => ['pedagogico', 'Gestão Pedagógica'],
            'formatura' => ['formatura', 'Formatura e Eventos'],
            'passeio' => ['passeio', 'Passeios'],
            'portfolio' => ['portfolio', 'Portfólio Digital'],
            'transporte' => ['transporte', 'Transporte Escolar'],
        ];
    }
}

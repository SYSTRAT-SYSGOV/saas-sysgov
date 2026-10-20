<?php

declare(strict_types=1);

namespace Modules\Pessoas\Services;

use InvalidArgumentException;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;

/** Módulos que sabem conciliar seus dados civis com o cadastro central. */
final class ConciliacaoRegistry
{
    /** @var array<string, ConciliacaoModuloInterface> */
    private array $modulos = [];

    public function registrar(ConciliacaoModuloInterface $modulo): void
    {
        $this->modulos[$modulo->modulo()] = $modulo;
    }

    public function obter(string $alias): ConciliacaoModuloInterface
    {
        return $this->modulos[$alias] ?? throw new InvalidArgumentException("Módulo sem conciliação registrada: {$alias}.");
    }

    /** @return list<string> */
    public function aliases(): array
    {
        $aliases = array_keys($this->modulos);
        sort($aliases);

        return $aliases;
    }
}

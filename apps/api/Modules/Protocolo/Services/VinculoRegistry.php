<?php

declare(strict_types=1);

namespace Modules\Protocolo\Services;

use Modules\Protocolo\Contracts\EntidadeVinculavel;

final class VinculoRegistry
{
    /**
     * @var array<string, EntidadeVinculavel>
     */
    private array $handlers = [];

    public function registrar(EntidadeVinculavel $handler): void
    {
        $this->handlers[$handler->tipo()] = $handler;
    }

    public function resolver(string $tipo): ?EntidadeVinculavel
    {
        return $this->handlers[$tipo] ?? null;
    }

    public function tem(string $tipo): bool
    {
        return isset($this->handlers[$tipo]);
    }

    /**
     * @return array<string, EntidadeVinculavel>
     */
    public function todos(): array
    {
        return $this->handlers;
    }

    public function limpar(): void
    {
        $this->handlers = [];
    }
}

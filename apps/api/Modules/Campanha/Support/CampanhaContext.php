<?php

declare(strict_types=1);

namespace Modules\Campanha\Support;

use LogicException;
use Modules\Campanha\Models\Campanha;

/**
 * Campanha de trabalho da requisição (D2) — espelho do EscolaContext. Nas rotas do módulo é
 * definida pelo middleware `campanha`; fora delas (comandos, seeders, testes), explicitamente.
 */
final class CampanhaContext
{
    private ?Campanha $campanha = null;

    public function set(Campanha $campanha): void
    {
        $this->campanha = $campanha;
    }

    public function clear(): void
    {
        $this->campanha = null;
    }

    public function hasCampanha(): bool
    {
        return $this->campanha !== null;
    }

    public function get(): Campanha
    {
        return $this->campanha ?? throw new LogicException('CampanhaContext não foi resolvido.');
    }

    public function id(): int
    {
        return $this->get()->id;
    }
}

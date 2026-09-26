<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models\Concerns;

use LogicException;

/**
 * Registros append-only (histórico, exceções judiciais, parâmetros): nenhuma
 * funcionalidade pode alterá-los ou excluí-los depois de criados (RNF-08).
 */
trait Imutavel
{
    protected static function bootImutavel(): void
    {
        static::updating(fn () => throw new LogicException('Registro imutável: alteração não permitida.'));
        static::deleting(fn () => throw new LogicException('Registro imutável: exclusão não permitida.'));
    }
}

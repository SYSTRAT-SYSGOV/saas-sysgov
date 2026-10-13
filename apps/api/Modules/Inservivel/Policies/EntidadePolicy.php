<?php

declare(strict_types=1);

namespace Modules\Inservivel\Policies;

/** Entidades e documentos na área interna: só com inservivel.entidades.manage (o PHP restringia ao Administrador). */
final class EntidadePolicy extends PermissaoSimplesPolicy
{
    protected function ver(): string
    {
        return 'inservivel.entidades.manage';
    }

    protected function gerir(): string
    {
        return 'inservivel.entidades.manage';
    }
}

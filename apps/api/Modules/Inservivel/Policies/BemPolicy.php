<?php

declare(strict_types=1);

namespace Modules\Inservivel\Policies;

/** Bens e fotos: ver com inservivel.view; cadastrar e editar com inservivel.bens.manage (spec: Cadastro de bens). */
final class BemPolicy extends PermissaoSimplesPolicy
{
    protected function ver(): string
    {
        return 'inservivel.view';
    }

    protected function gerir(): string
    {
        return 'inservivel.bens.manage';
    }
}

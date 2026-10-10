<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

/** Pesquisas eleitorais: ver com campanha.view; escrever com campanha.pesquisas.manage. */
final class PesquisaPolicy extends PermissaoSimplesPolicy
{
    protected function ver(): string
    {
        return 'campanha.view';
    }

    protected function gerir(): string
    {
        return 'campanha.pesquisas.manage';
    }
}

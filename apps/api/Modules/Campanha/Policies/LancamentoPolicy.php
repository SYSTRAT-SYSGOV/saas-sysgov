<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

/** Livro-caixa e comprovantes: ver com campanha.financeiro.view; escrever com campanha.financeiro.manage. */
final class LancamentoPolicy extends PermissaoSimplesPolicy
{
    protected function ver(): string
    {
        return 'campanha.financeiro.view';
    }

    protected function gerir(): string
    {
        return 'campanha.financeiro.manage';
    }
}

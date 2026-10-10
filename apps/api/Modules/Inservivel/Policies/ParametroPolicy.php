<?php

declare(strict_types=1);

namespace Modules\Inservivel\Policies;

/**
 * Parâmetros (categorias, situações, estados) e configurações: ver com inservivel.view (os formulários de bem usam
 * as listas); alterar com inservivel.configuracao.manage.
 */
final class ParametroPolicy extends PermissaoSimplesPolicy
{
    protected function ver(): string
    {
        return 'inservivel.view';
    }

    protected function gerir(): string
    {
        return 'inservivel.configuracao.manage';
    }
}

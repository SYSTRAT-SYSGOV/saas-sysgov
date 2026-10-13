<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

/** Eventos, reuniões e visitas: ver com campanha.view; escrever com campanha.agenda.manage. */
final class AgendaPolicy extends PermissaoSimplesPolicy
{
    protected function ver(): string
    {
        return 'campanha.view';
    }

    protected function gerir(): string
    {
        return 'campanha.agenda.manage';
    }
}

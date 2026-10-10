<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Policies\Concerns\PermissoesCampanha;

/**
 * Eleitores: dados pessoais com campanha.eleitores.view; exportar e excluir com campanha.eleitores.manage;
 * indicadores e mapa de calor (sem dado pessoal) com campanha.view.
 */
final class EleitorPolicy
{
    use PermissoesCampanha;

    public function indicadores(User $user): bool
    {
        return $this->pode($user, 'campanha.view');
    }

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'campanha.eleitores.view');
    }

    public function view(User $user, Eleitor $eleitor): bool
    {
        return $this->doTenant($eleitor) && $this->viewAny($user);
    }

    public function exportar(User $user): bool
    {
        return $this->pode($user, 'campanha.eleitores.manage');
    }

    public function delete(User $user, Eleitor $eleitor): bool
    {
        return $this->doTenant($eleitor) && $this->pode($user, 'campanha.eleitores.manage');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use Modules\Campanha\Models\Demanda;
use Modules\Campanha\Policies\Concerns\PermissoesCampanha;

/** Demandas: ver com campanha.view; registrar e alterar com campanha.demandas.manage. */
final class DemandaPolicy
{
    use PermissoesCampanha;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'campanha.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'campanha.demandas.manage');
    }

    public function update(User $user, Demanda $demanda): bool
    {
        return $this->doTenant($demanda) && $this->create($user);
    }

    public function delete(User $user, Demanda $demanda): bool
    {
        return $this->update($user, $demanda);
    }
}

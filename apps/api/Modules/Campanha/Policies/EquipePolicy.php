<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Modules\Campanha\Policies\Concerns\PermissoesCampanha;

/**
 * Coordenadores, cabos eleitorais, prefeitos e vereadores: ver com campanha.view; escrever com
 * campanha.equipes.manage. O registro de outra campanha nem chega aqui (CampanhaAware → 404).
 */
final class EquipePolicy
{
    use PermissoesCampanha;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'campanha.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'campanha.equipes.manage');
    }

    public function update(User $user, Model $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'campanha.equipes.manage');
    }

    public function delete(User $user, Model $registro): bool
    {
        return $this->update($user, $registro);
    }
}

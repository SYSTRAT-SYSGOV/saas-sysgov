<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\Turno;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Turnos: escrita com escola.estrutura.manage. */
final class TurnoPolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, Turno $turno): bool
    {
        return $this->doTenant($turno) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.estrutura.manage');
    }

    public function update(User $user, Turno $turno): bool
    {
        return $this->doTenant($turno) && $this->pode($user, 'escola.estrutura.manage');
    }

    public function delete(User $user, Turno $turno): bool
    {
        return $this->doTenant($turno) && $this->pode($user, 'escola.estrutura.manage');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\Materia;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Matérias (inclui importação e exportação): escrita com escola.estrutura.manage. */
final class MateriaPolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, Materia $materia): bool
    {
        return $this->doTenant($materia) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.estrutura.manage');
    }

    public function update(User $user, Materia $materia): bool
    {
        return $this->doTenant($materia) && $this->pode($user, 'escola.estrutura.manage');
    }

    public function delete(User $user, Materia $materia): bool
    {
        return $this->doTenant($materia) && $this->pode($user, 'escola.estrutura.manage');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\Trimestre;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Trimestres letivos: escrita com escola.estrutura.manage. */
final class TrimestrePolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, Trimestre $trimestre): bool
    {
        return $this->doTenant($trimestre) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.estrutura.manage');
    }

    public function update(User $user, Trimestre $trimestre): bool
    {
        return $this->doTenant($trimestre) && $this->pode($user, 'escola.estrutura.manage');
    }

    public function delete(User $user, Trimestre $trimestre): bool
    {
        return $this->doTenant($trimestre) && $this->pode($user, 'escola.estrutura.manage');
    }
}

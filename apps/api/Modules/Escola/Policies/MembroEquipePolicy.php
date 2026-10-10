<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\MembroEquipe;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Equipe gestora: leitura com escola.view, escrita com escola.estrutura.manage. */
final class MembroEquipePolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, MembroEquipe $membro): bool
    {
        return $this->doTenant($membro) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.estrutura.manage');
    }

    public function update(User $user, MembroEquipe $membro): bool
    {
        return $this->doTenant($membro) && $this->pode($user, 'escola.estrutura.manage');
    }

    public function delete(User $user, MembroEquipe $membro): bool
    {
        return $this->doTenant($membro) && $this->pode($user, 'escola.estrutura.manage');
    }
}

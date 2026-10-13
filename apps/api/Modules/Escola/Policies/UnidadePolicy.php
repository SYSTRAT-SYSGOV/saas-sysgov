<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\Unidade;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Configuração da unidade (nome e logo): escrita com escola.estrutura.manage. */
final class UnidadePolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, Unidade $unidade): bool
    {
        return $this->doTenant($unidade) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.estrutura.manage');
    }

    public function update(User $user, Unidade $unidade): bool
    {
        return $this->doTenant($unidade) && $this->pode($user, 'escola.estrutura.manage');
    }

    public function delete(User $user, Unidade $unidade): bool
    {
        return $this->doTenant($unidade) && $this->pode($user, 'escola.estrutura.manage');
    }
}

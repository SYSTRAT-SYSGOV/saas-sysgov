<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\Turma;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Turmas e vínculos turma × matéria × professor: escrita com escola.estrutura.manage. */
final class TurmaPolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, Turma $turma): bool
    {
        return $this->doTenant($turma) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.estrutura.manage');
    }

    public function update(User $user, Turma $turma): bool
    {
        return $this->doTenant($turma) && $this->pode($user, 'escola.estrutura.manage');
    }

    public function delete(User $user, Turma $turma): bool
    {
        return $this->doTenant($turma) && $this->pode($user, 'escola.estrutura.manage');
    }
}

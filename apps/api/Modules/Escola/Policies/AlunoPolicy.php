<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Alunos: leitura com escola.view, escrita (inclui importação, remanejamento e foto) com escola.alunos.manage. */
final class AlunoPolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, Aluno $aluno): bool
    {
        return $this->doTenant($aluno) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.alunos.manage');
    }

    public function update(User $user, Aluno $aluno): bool
    {
        return $this->doTenant($aluno) && $this->pode($user, 'escola.alunos.manage');
    }

    public function delete(User $user, Aluno $aluno): bool
    {
        return $this->doTenant($aluno) && $this->pode($user, 'escola.alunos.manage');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Formacao;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class FormacaoPolicy
{
    use PermissoesCursos;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'cursos.view');
    }

    public function view(User $user, Formacao $formacao): bool
    {
        return $this->doTenant($formacao) && $this->pode($user, 'cursos.view');
    }

    public function create(User $user): bool
    {
        return $this->administra($user);
    }

    public function update(User $user, Formacao $formacao): bool
    {
        return $this->doTenant($formacao) && $this->administra($user);
    }

    public function delete(User $user, Formacao $formacao): bool
    {
        return $this->doTenant($formacao) && $this->administra($user);
    }
}

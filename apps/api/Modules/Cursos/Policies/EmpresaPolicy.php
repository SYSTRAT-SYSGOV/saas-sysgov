<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Empresa;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class EmpresaPolicy
{
    use PermissoesCursos;

    public function viewAny(User $user): bool
    {
        return $this->administra($user);
    }

    public function create(User $user): bool
    {
        return $this->administra($user);
    }

    public function update(User $user, Empresa $empresa): bool
    {
        return $this->doTenant($empresa) && $this->administra($user);
    }

    public function delete(User $user, Empresa $empresa): bool
    {
        return $this->doTenant($empresa) && $this->administra($user);
    }
}

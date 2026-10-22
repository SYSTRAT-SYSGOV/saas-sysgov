<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Fundo;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class FundoPolicy
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

    public function update(User $user, Fundo $fundo): bool
    {
        return $this->doTenant($fundo) && $this->administra($user);
    }

    public function delete(User $user, Fundo $fundo): bool
    {
        return $this->doTenant($fundo) && $this->administra($user);
    }
}

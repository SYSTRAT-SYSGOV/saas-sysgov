<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\ModeloCertificado;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class ModeloCertificadoPolicy
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

    public function update(User $user, ModeloCertificado $modelo): bool
    {
        return $this->doTenant($modelo) && $this->administra($user);
    }

    public function delete(User $user, ModeloCertificado $modelo): bool
    {
        return $this->doTenant($modelo) && $this->administra($user);
    }
}

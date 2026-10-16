<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\TextoCertificado;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class TextoCertificadoPolicy
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

    public function update(User $user, TextoCertificado $texto): bool
    {
        return $this->doTenant($texto) && $this->administra($user);
    }

    public function delete(User $user, TextoCertificado $texto): bool
    {
        return $this->doTenant($texto) && $this->administra($user);
    }
}

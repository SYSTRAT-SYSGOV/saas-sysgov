<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Assinatura;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class AssinaturaPolicy
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

    public function update(User $user, Assinatura $assinatura): bool
    {
        return $this->doTenant($assinatura) && $this->administra($user);
    }

    public function delete(User $user, Assinatura $assinatura): bool
    {
        return $this->doTenant($assinatura) && $this->administra($user);
    }
}

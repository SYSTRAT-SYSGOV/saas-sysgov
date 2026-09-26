<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Certificado;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class CertificadoPolicy
{
    use PermissoesCursos;

    public function viewAny(User $user): bool
    {
        return $this->administra($user);
    }

    /** Ver e baixar: o próprio participante ou o Administrador. */
    public function view(User $user, Certificado $certificado): bool
    {
        if (!$this->doTenant($certificado)) {
            return false;
        }

        return $this->administra($user)
            || ($this->pode($user, 'cursos.participar') && $certificado->participante->user_id === (int) $user->id);
    }

    public function revogar(User $user, Certificado $certificado): bool
    {
        return $this->doTenant($certificado) && $this->administra($user);
    }
}

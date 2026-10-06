<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;

final class FormularioPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('vistoria.view');
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('vistoria.formularios.manage');
    }
}

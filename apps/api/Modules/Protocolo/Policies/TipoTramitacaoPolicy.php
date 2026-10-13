<?php

declare(strict_types=1);

namespace Modules\Protocolo\Policies;

use App\Models\User;

final class TipoTramitacaoPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function manage(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('protocolo.tipos_tramitacao.manage');
    }
}

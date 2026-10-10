<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use Modules\Campanha\Policies\Concerns\PermissoesCampanha;

/** Municípios na campanha: ver com campanha.view; alterar com campanha.municipios.manage (o acesso à campanha é do middleware). */
final class MunicipioCampanhaPolicy
{
    use PermissoesCampanha;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'campanha.view');
    }

    public function update(User $user): bool
    {
        return $this->pode($user, 'campanha.municipios.manage');
    }
}

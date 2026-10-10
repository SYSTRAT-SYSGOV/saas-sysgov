<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\Escola;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Cadastro das escolas do órgão: só com escola.escolas.manage (por padrão, o admin geral). */
final class EscolaPolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.escolas.manage');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.escolas.manage');
    }

    public function update(User $user, Escola $escola): bool
    {
        return $this->doTenant($escola) && $this->pode($user, 'escola.escolas.manage');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Campanha\Http\Middleware\ResolveCampanha;
use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Policies\Concerns\PermissoesCampanha;

/** Campanhas: ver exige acesso (membro ou gestão); criar, alterar, excluir, candidato e membros com campanha.gestao.manage. */
final class CampanhaPolicy
{
    use PermissoesCampanha;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'campanha.view');
    }

    public function view(User $user, Campanha $campanha): bool
    {
        return $this->doTenant($campanha) && $this->pode($user, 'campanha.view')
            && ResolveCampanha::podeAcessar($user, $campanha, app(TenantContext::class)->id());
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'campanha.gestao.manage');
    }

    public function update(User $user, Campanha $campanha): bool
    {
        return $this->doTenant($campanha) && $this->pode($user, 'campanha.gestao.manage');
    }

    public function delete(User $user, Campanha $campanha): bool
    {
        return $this->update($user, $campanha);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use Modules\Campanha\Models\LinkCaptacao;
use Modules\Campanha\Policies\Concerns\PermissoesCampanha;

/** Links de captação: tudo com campanha.eleitores.manage. O de outra campanha nem chega aqui (CampanhaAware → 404). */
final class LinkCaptacaoPolicy
{
    use PermissoesCampanha;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'campanha.eleitores.manage');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'campanha.eleitores.manage');
    }

    public function view(User $user, LinkCaptacao $link): bool
    {
        return $this->doTenant($link) && $this->pode($user, 'campanha.eleitores.manage');
    }

    public function update(User $user, LinkCaptacao $link): bool
    {
        return $this->view($user, $link);
    }

    public function delete(User $user, LinkCaptacao $link): bool
    {
        return $this->view($user, $link);
    }
}

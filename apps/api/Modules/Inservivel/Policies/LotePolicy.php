<?php

declare(strict_types=1);

namespace Modules\Inservivel\Policies;

use App\Models\User;
use Modules\Inservivel\Models\Lote;
use Modules\Inservivel\Policies\Concerns\PermissoesInservivel;

/**
 * Lotes (D5): com inservivel.lotes.gestao, todos; com inservivel.lotes.manage, só os que o usuário criou. Status,
 * sorteio e exclusão só com a gestão.
 */
final class LotePolicy
{
    use PermissoesInservivel;

    public function viewAny(User $user): bool
    {
        return $this->gestao($user) || $this->pode($user, 'inservivel.lotes.manage');
    }

    public function view(User $user, Lote $lote): bool
    {
        return $this->doTenant($lote) && ($this->gestao($user) || ($this->pode($user, 'inservivel.lotes.manage') && $lote->criado_por === $user->id));
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    /** Editar dados, mexer nos bens e anexar documentos. */
    public function update(User $user, Lote $lote): bool
    {
        return $this->view($user, $lote);
    }

    public function gerir(User $user, Lote $lote): bool
    {
        return $this->doTenant($lote) && $this->gestao($user);
    }

    public function delete(User $user, Lote $lote): bool
    {
        return $this->gerir($user, $lote);
    }

    public function gestao(User $user): bool
    {
        return $this->pode($user, 'inservivel.lotes.gestao');
    }
}

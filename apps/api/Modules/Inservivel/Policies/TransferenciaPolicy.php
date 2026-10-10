<?php

declare(strict_types=1);

namespace Modules\Inservivel\Policies;

use App\Models\User;
use Modules\Inservivel\Models\Transferencia;
use Modules\Inservivel\Policies\Concerns\PermissoesInservivel;

/**
 * Transferência interna: vitrine, anunciar, solicitar e cancelar com inservivel.transferencias.manage; tela de
 * Solicitações, aprovar e recusar só com inservivel.transferencias.aprovar (o Patrimônio). A regra de secretaria
 * (anunciar só da própria, não solicitar da própria) fica no TransferenciaService.
 */
final class TransferenciaPolicy
{
    use PermissoesInservivel;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'inservivel.transferencias.manage') || $this->aprovarQualquer($user);
    }

    public function view(User $user, Transferencia $t): bool
    {
        return $this->doTenant($t) && $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'inservivel.transferencias.manage');
    }

    public function solicitar(User $user, Transferencia $t): bool
    {
        return $this->doTenant($t) && $this->create($user);
    }

    public function cancelar(User $user, Transferencia $t): bool
    {
        return $this->doTenant($t) && ($this->create($user) || $this->aprovarQualquer($user));
    }

    public function aprovar(User $user, Transferencia $t): bool
    {
        return $this->doTenant($t) && $this->aprovarQualquer($user);
    }

    public function aprovarQualquer(User $user): bool
    {
        return $this->pode($user, 'inservivel.transferencias.aprovar');
    }
}

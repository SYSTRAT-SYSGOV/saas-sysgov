<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Policies;

use App\Models\User;
use Modules\Cemiterios\Models\Concessao;
use Illuminate\Auth\Access\HandlesAuthorization;

class ConcessionPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('cemiterios.concessoes.manage');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Concessao $concessao): bool
    {
        return $user->can('cemiterios.concessoes.manage');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('cemiterios.concessoes.manage');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Concessao $concessao): bool
    {
        return $user->can('cemiterios.concessoes.manage');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Concessao $concessao): bool
    {
        return $user->can('cemiterios.concessoes.manage');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Concessao $concessao): bool
    {
        return $user->can('cemiterios.concessoes.manage');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Concessao $concessao): bool
    {
        return $user->can('cemiterios.concessoes.manage');
    }
}
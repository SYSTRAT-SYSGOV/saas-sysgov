<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Policies;

use App\Models\User;
use Modules\Cemiterios\Models\Sucessao;
use Modules\Cemiterios\Models\SucessaoDocumento;
use Illuminate\Auth\Access\HandlesAuthorization;

class SucessaoPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('cemiterios.sucessao.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Sucessao $sucessao): bool
    {
        return $user->hasPermission('cemiterios.sucessao.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('cemiterios.sucessao.manage');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Sucessao $sucessao): bool
    {
        return $user->hasPermission('cemiterios.sucessao.manage');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Sucessao $sucessao): bool
    {
        return $user->hasPermission('cemiterios.sucessao.manage');
    }

    /**
     * Determine whether the user can transition the state.
     */
    public function transition(User $user, Sucessao $sucessao): bool
    {
        return $user->hasPermission('cemiterios.sucessao.transition');
    }

    /**
     * Determine whether the user can view documents.
     */
    public function viewDocument(User $user, Sucessao $sucessao, SucessaoDocumento $documento): bool
    {
        return $user->hasPermission('cemiterios.sucessao.view');
    }

    /**
     * Determine whether the user can download documents.
     */
    public function downloadDocument(User $user, Sucessao $sucessao, SucessaoDocumento $documento): bool
    {
        return $user->hasPermission('cemiterios.sucessao.view');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Sucessao $sucessao): bool
    {
        return $user->hasPermission('cemiterios.sucessao.manage');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Sucessao $sucessao): bool
    {
        return $user->hasPermission('cemiterios.sucessao.manage');
    }
}
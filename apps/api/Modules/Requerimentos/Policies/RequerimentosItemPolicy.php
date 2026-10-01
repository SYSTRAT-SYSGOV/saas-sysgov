<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Policies;

use App\Models\User;
use Modules\Requerimentos\Models\RequerimentosItem;
use Modules\Requerimentos\Policies\Concerns\PermissoesRequerimentos;

final class RequerimentosItemPolicy
{
    use PermissoesRequerimentos;

    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('requerimentos.view');
    }

    public function view(User $user, RequerimentosItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('requerimentos.view') && $this->doTenant($item));
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('requerimentos.create');
    }

    public function update(User $user, RequerimentosItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('requerimentos.edit') && $this->doTenant($item));
    }

    public function delete(User $user, RequerimentosItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('requerimentos.delete') && $this->doTenant($item));
    }
}
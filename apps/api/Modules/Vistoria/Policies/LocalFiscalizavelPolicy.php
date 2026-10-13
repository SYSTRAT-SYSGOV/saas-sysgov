<?php

declare(strict_types=1);

namespace Modules\Vistoria\Policies;

use App\Models\User;
use Modules\Vistoria\Models\LocalFiscalizavel;

final class LocalFiscalizavelPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('vistoria.view');
    }

    public function view(User $user, LocalFiscalizavel $local): bool
    {
        return $user->is_platform_admin
            || ($user->hasPermission('vistoria.view') && $user->currentTenantId() === $local->tenant_id);
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('vistoria.locais.manage');
    }

    public function update(User $user, LocalFiscalizavel $local): bool
    {
        return $user->is_platform_admin
            || ($user->hasPermission('vistoria.locais.manage') && $user->currentTenantId() === $local->tenant_id);
    }

    public function delete(User $user, LocalFiscalizavel $local): bool
    {
        return $user->is_platform_admin
            || ($user->hasPermission('vistoria.locais.manage') && $user->currentTenantId() === $local->tenant_id);
    }
}

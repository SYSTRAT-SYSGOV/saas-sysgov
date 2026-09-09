<?php

declare(strict_types=1);

namespace Modules\Licita\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Licita\Models\Processo;

final class ProcessoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasPermission($user, 'licita.view');
    }

    public function view(User $user, Processo $processo): bool
    {
        return $this->hasPermission($user, 'licita.view') && $processo->tenant_id === app(TenantContext::class)->id();
    }

    public function create(User $user): bool
    {
        return $this->hasPermission($user, 'licita.create');
    }

    public function update(User $user, Processo $processo): bool
    {
        return $this->hasPermission($user, 'licita.update') && $processo->tenant_id === app(TenantContext::class)->id();
    }

    private function hasPermission(User $user, string $permission): bool
    {
        return $user->is_platform_admin || $user->hasPermission($permission);
    }
}

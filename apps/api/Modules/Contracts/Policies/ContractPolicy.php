<?php

declare(strict_types=1);

namespace Modules\Contracts\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Contracts\Models\Contract;

final class ContractPolicy
{
    public function viewAny(User $user): bool { return $this->hasPermission($user, 'contracts.view'); }
    public function view(User $user, Contract $contract): bool { return $this->hasPermission($user, 'contracts.view') && $contract->tenant_id === app(TenantContext::class)->id(); }
    public function create(User $user): bool { return $this->hasPermission($user, 'contracts.manage'); }
    public function update(User $user, Contract $contract): bool { return $this->hasPermission($user, 'contracts.manage') && $contract->tenant_id === app(TenantContext::class)->id(); }
    private function hasPermission(User $user, string $permission): bool { return $user->is_platform_admin || $user->roles()->where('tenant_id', app(TenantContext::class)->id())->whereHas('permissions', fn ($query) => $query->where('name', $permission))->exists(); }
}

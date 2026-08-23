<?php

declare(strict_types=1);

namespace Modules\Finance\Policies;

use App\Models\User;
use App\Support\TenantContext;

final class FinanceEntryPolicy
{
    public function viewAny(User $user): bool { return $this->hasPermission($user, 'finance.view'); }
    public function view(User $user, mixed $entry): bool { return $this->hasPermission($user, 'finance.view') && $entry->tenant_id === app(TenantContext::class)->id(); }
    public function create(User $user): bool { return $this->hasPermission($user, 'finance.manage'); }
    public function update(User $user, mixed $entry): bool { return $this->hasPermission($user, 'finance.manage') && $entry->tenant_id === app(TenantContext::class)->id(); }
    private function hasPermission(User $user, string $permission): bool { return $user->is_platform_admin || $user->roles()->where('tenant_id', app(TenantContext::class)->id())->whereHas('permissions', fn ($query) => $query->where('name', $permission))->exists(); }
}

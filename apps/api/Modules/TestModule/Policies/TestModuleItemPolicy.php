<?php

declare(strict_types=1);

namespace Modules\TestModule\Policies;

use App\Models\User;
use Modules\TestModule\Models\TestModuleItem;

final class TestModuleItemPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('testmodule.view');
    }

    public function view(User $user, TestModuleItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('testmodule.view') && $user->belongsToTenant($item->tenant_id));
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('testmodule.create');
    }

    public function update(User $user, TestModuleItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('testmodule.edit') && $user->belongsToTenant($item->tenant_id));
    }

    public function delete(User $user, TestModuleItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('testmodule.delete') && $user->belongsToTenant($item->tenant_id));
    }
}
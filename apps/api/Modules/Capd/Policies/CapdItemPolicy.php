<?php

declare(strict_types=1);

namespace Modules\Capd\Policies;

use App\Models\User;
use Modules\Capd\Models\CapdItem;

final class CapdItemPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('capd.view');
    }

    public function view(User $user, CapdItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('capd.view') && $user->belongsToTenant($item->tenant_id));
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('capd.create');
    }

    public function update(User $user, CapdItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('capd.edit') && $user->belongsToTenant($item->tenant_id));
    }

    public function delete(User $user, CapdItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('capd.delete') && $user->belongsToTenant($item->tenant_id));
    }
}
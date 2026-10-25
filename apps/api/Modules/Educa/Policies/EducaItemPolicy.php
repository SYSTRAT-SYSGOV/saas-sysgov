<?php

declare(strict_types=1);

namespace Modules\Educa\Policies;

use App\Models\User;
use Modules\Educa\Models\EducaItem;

final class EducaItemPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('educa.view');
    }

    public function view(User $user, EducaItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('educa.view') && $user->belongsToTenant($item->tenant_id));
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin || $user->hasPermission('educa.create');
    }

    public function update(User $user, EducaItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('educa.edit') && $user->belongsToTenant($item->tenant_id));
    }

    public function delete(User $user, EducaItem $item): bool
    {
        return $user->is_platform_admin || ($user->hasPermission('educa.delete') && $user->belongsToTenant($item->tenant_id));
    }
}
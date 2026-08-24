<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use Modules\Admin\Models\MenuGroup;

final class MenuGroupPolicy
{
    public function viewAny(User $user): bool { return $user->is_platform_admin; }
    public function view(User $user, MenuGroup $group): bool { return $user->is_platform_admin; }
    public function create(User $user): bool { return $user->is_platform_admin; }
    public function update(User $user, MenuGroup $group): bool { return $user->is_platform_admin; }
    public function delete(User $user, MenuGroup $group): bool { return $user->is_platform_admin; }
}

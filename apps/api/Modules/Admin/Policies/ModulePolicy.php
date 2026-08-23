<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use Modules\Admin\Models\Module;

final class ModulePolicy
{
    public function viewAny(User $user): bool { return $user->is_platform_admin; }
    public function toggle(User $user, Module $module): bool { return $user->is_platform_admin; }
}

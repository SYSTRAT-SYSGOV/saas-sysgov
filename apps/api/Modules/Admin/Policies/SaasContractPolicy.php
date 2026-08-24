<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use Modules\Admin\Models\SaasContract;

final class SaasContractPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin;
    }

    public function view(User $user, SaasContract $contract): bool
    {
        return $user->is_platform_admin;
    }

    public function create(User $user): bool
    {
        return $user->is_platform_admin;
    }

    public function update(User $user, SaasContract $contract): bool
    {
        return $user->is_platform_admin;
    }

    public function delete(User $user, SaasContract $contract): bool
    {
        return $user->is_platform_admin;
    }

    public function renew(User $user, SaasContract $contract): bool
    {
        return $user->is_platform_admin;
    }

    public function adjust(User $user, SaasContract $contract): bool
    {
        return $user->is_platform_admin;
    }
}

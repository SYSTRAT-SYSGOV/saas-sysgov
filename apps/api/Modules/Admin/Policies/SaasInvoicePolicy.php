<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use Modules\Admin\Models\SaasInvoice;

final class SaasInvoicePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_platform_admin;
    }

    public function view(User $user, SaasInvoice $invoice): bool
    {
        return $user->is_platform_admin;
    }

    public function update(User $user, SaasInvoice $invoice): bool
    {
        return $user->is_platform_admin;
    }
}

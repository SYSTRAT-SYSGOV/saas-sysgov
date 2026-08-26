<?php

declare(strict_types=1);

namespace Modules\Admin\Policies;

use App\Models\User;
use App\Support\TenantContext;

/**
 * Policy do FLUXO B (web-client) — nunca misturar com UserPolicy (Fluxo A).
 * Garante: somente admin_tenant (ou super_admin) e o registro pertence ao tenant ativo (anti-BOLA).
 */
final class TenantUserPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isTenantManager($user);
    }

    public function view(User $user, User $target): bool
    {
        return $this->isTenantManager($user) && $this->belongsToActiveTenant($target);
    }

    public function create(User $user): bool
    {
        return $this->isTenantManager($user);
    }

    public function update(User $user, User $target): bool
    {
        return $this->isTenantManager($user) && $this->belongsToActiveTenant($target);
    }

    public function deactivate(User $user, User $target): bool
    {
        return $this->isTenantManager($user) && $this->belongsToActiveTenant($target);
    }

    public function reactivate(User $user, User $target): bool
    {
        return $this->isTenantManager($user) && $this->belongsToActiveTenant($target);
    }

    public function assignRole(User $user, User $target): bool
    {
        return $this->isTenantManager($user) && $this->belongsToActiveTenant($target);
    }

    private function isTenantManager(User $user): bool
    {
        if ($user->is_platform_admin) {
            return true;
        }

        return $user->hasRole('admin_tenant');
    }

    /**
     * Anti-BOLA: o usuário-alvo DEVE estar vinculado ao tenant ativo.
     */
    private function belongsToActiveTenant(User $user): bool
    {
        $tenantId = app(TenantContext::class)->id();

        if (!$tenantId) {
            return false;
        }

        return $user->tenants()
            ->where('tenants.id', $tenantId)
            ->exists();
    }
}

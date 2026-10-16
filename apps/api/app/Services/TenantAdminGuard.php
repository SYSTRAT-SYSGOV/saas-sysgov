<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/**
 * Salvaguarda "o tenant mantém ao menos um administrador ativo" (RN-USR-006 / RN-USR-011).
 *
 * Administrador ativo = conta ativa + vínculo `active` com o tenant + role `admin_tenant` do tenant.
 */
final class TenantAdminGuard
{
    public const MESSAGE = 'O tenant precisa manter ao menos um administrador ativo.';

    /**
     * @return Builder<User>
     */
    public function activeAdmins(int $tenantId): Builder
    {
        return User::query()
            ->where('is_active', true)
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId)->where('tenant_user.status', 'active'))
            ->whereHas('roles', fn ($q) => $q->where('roles.slug', 'admin_tenant')->where('roles.tenant_id', $tenantId));
    }

    public function isActiveAdmin(User $user, int $tenantId): bool
    {
        return $this->activeAdmins($tenantId)->whereKey($user->getKey())->exists();
    }

    /** O usuário é administrador ativo e não existe nenhum outro no tenant. */
    public function isLastActiveAdmin(User $user, int $tenantId): bool
    {
        return $this->isActiveAdmin($user, $tenantId)
            && !$this->activeAdmins($tenantId)->where('users.id', '!=', $user->getKey())->exists();
    }

    /**
     * @throws ValidationException
     */
    public function assertNotLastAdmin(User $user, int $tenantId): void
    {
        if ($this->isLastActiveAdmin($user, $tenantId)) {
            throw ValidationException::withMessages(['user' => self::MESSAGE]);
        }
    }

    /**
     * Impede desativar a conta de quem é o único administrador ativo de algum tenant.
     *
     * @throws ValidationException
     */
    public function assertNotLastAdminOfAnyTenant(User $user): void
    {
        $tenantIds = $user->tenants()->wherePivot('status', 'active')->pluck('tenants.id');

        foreach ($tenantIds as $tenantId) {
            $this->assertNotLastAdmin($user, (int) $tenantId);
        }
    }
}

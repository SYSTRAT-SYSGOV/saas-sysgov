<?php

declare(strict_types=1);

namespace Modules\Licita\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Licita\Models\LegalDocumento;

final class LegalDocumentoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->hasPermission($user, 'licita.view');
    }

    public function view(User $user, LegalDocumento $documento): bool
    {
        return $this->hasPermission($user, 'licita.view');
    }

    public function create(User $user): bool
    {
        return $this->hasPermission($user, 'licita.legislacao.manage');
    }

    public function update(User $user, LegalDocumento $documento): bool
    {
        if ($documento->isGlobal()) {
            return $user->is_platform_admin;
        }

        return $this->hasPermission($user, 'licita.legislacao.manage') && $documento->tenant_id === app(TenantContext::class)->id();
    }

    public function delete(User $user, LegalDocumento $documento): bool
    {
        return $this->update($user, $documento);
    }

    private function hasPermission(User $user, string $permission): bool
    {
        return $user->is_platform_admin || $user->hasPermission($permission);
    }
}

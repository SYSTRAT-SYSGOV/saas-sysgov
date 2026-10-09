<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;

final readonly class OcorrenciaQueimadaPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view');
    }

    public function view(User $user, OcorrenciaQueimada $ocorrencia): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.view') && $this->mesmoTenant($user, $ocorrencia);
    }

    public function create(User $user): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.queimadas.registrar');
    }

    public function update(User $user, OcorrenciaQueimada $ocorrencia): bool
    {
        return $this->temPermissao($user, 'meio_ambiente.queimadas.registrar') && $this->mesmoTenant($user, $ocorrencia);
    }

    private function temPermissao(User $user, string $permissao): bool
    {
        return (bool) $user->getAttribute('is_platform_admin')
            || $user->hasPermission($permissao);
    }

    private function mesmoTenant(User $user, OcorrenciaQueimada $ocorrencia): bool
    {
        $tenantId = app(TenantContext::class)->id();

        return $ocorrencia->tenant_id === $tenantId;
    }
}

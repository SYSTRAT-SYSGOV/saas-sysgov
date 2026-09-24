<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies\Concerns;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;

/**
 * Permissões do módulo sempre avaliadas no tenant da requisição
 * (TenantContext resolvido pelo middleware 'tenant').
 */
trait PermissoesCursos
{
    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    /**
     * Defesa em profundidade: o objeto tem de ser do tenant da requisição,
     * mesmo que um binding de rota o tenha carregado sem o filtro do
     * TenantAware.
     */
    private function doTenant(Model $objeto): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && (int) $objeto->getAttribute('tenant_id') === $context->id();
    }

    private function administra(User $user): bool
    {
        return $this->pode($user, 'cursos.manage');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Policies\Concerns;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;

/**
 * Permissões do módulo sempre avaliadas no tenant da requisição (TenantContext do middleware 'tenant').
 */
trait PermissoesEscola
{
    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    /** Defesa em profundidade: o objeto precisa ser do tenant da requisição. */
    private function doTenant(Model $objeto): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && (int) $objeto->getAttribute('tenant_id') === $context->id();
    }
}

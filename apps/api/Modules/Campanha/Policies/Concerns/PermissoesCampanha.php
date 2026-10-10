<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies\Concerns;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;

/** Checagens comuns das policies do módulo: permissão no tenant ativo e registro do tenant. */
trait PermissoesCampanha
{
    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    private function doTenant(Model $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && (int) $registro->getAttribute('tenant_id') === $context->id();
    }
}

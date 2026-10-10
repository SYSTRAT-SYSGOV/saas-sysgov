<?php

declare(strict_types=1);

namespace Modules\Formatura\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Formatura\Models\Pagamento;

/** Pagamentos: registro e estorno com formatura.pagamentos.manage. */
final class PagamentoPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'formatura.view');
    }

    public function view(User $user, Pagamento $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'formatura.pagamentos.manage');
    }

    public function update(User $user, Pagamento $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.pagamentos.manage');
    }

    public function delete(User $user, Pagamento $registro): bool
    {
        return $this->doTenant($registro) && $this->pode($user, 'formatura.pagamentos.manage');
    }

    private function pode(User $user, string $permissao): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $user->hasPermission($permissao, $context->id());
    }

    private function doTenant(Pagamento $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}

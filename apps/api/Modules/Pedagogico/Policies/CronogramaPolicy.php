<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Pedagogico\Models\Cronograma;
use Modules\Pedagogico\Services\EscopoProfessor;

/** Cronograma do pré-conselho: escrita com pedagogico.conselho.manage; leitura com pedagogico.view. */
final class CronogramaPolicy
{
    public function __construct(private readonly EscopoProfessor $escopo) {}

    public function viewAny(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.view');
    }

    public function view(User $user, Cronograma $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.view');
    }

    public function create(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.conselho.manage');
    }

    public function update(User $user, Cronograma $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.conselho.manage');
    }

    public function delete(User $user, Cronograma $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.conselho.manage');
    }

    private function doTenant(Cronograma $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}

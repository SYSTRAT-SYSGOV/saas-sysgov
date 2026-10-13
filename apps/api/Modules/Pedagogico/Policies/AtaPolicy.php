<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Pedagogico\Models\Ata;
use Modules\Pedagogico\Services\EscopoProfessor;

/** Atas do conselho de classe: escrita com pedagogico.conselho.manage. */
final class AtaPolicy
{
    public function __construct(private readonly EscopoProfessor $escopo) {}

    public function viewAny(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.view');
    }

    public function view(User $user, Ata $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.view') && (!$this->escopo->restrito($user) || $this->escopo->vinculado($user, $registro->turma_id));
    }

    public function create(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.conselho.manage');
    }

    public function update(User $user, Ata $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.conselho.manage');
    }

    public function delete(User $user, Ata $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.conselho.manage');
    }

    private function doTenant(Ata $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}

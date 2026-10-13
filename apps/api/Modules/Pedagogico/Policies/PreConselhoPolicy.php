<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Pedagogico\Models\PreConselho;
use Modules\Pedagogico\Services\EscopoProfessor;

/** Fichas de pré-conselho: gestão com pedagogico.conselho.manage; o professor só as das suas turmas × matérias. */
final class PreConselhoPolicy
{
    public function __construct(private readonly EscopoProfessor $escopo) {}

    public function viewAny(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.view');
    }

    public function view(User $user, PreConselho $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.view') && (!$this->escopo->restrito($user) || $this->escopo->vinculado($user, $registro->turma_id, $registro->materia_id));
    }

    public function create(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.conselho.manage');
    }

    public function update(User $user, PreConselho $registro): bool
    {
        return $this->doTenant($registro) && ($this->escopo->pode($user, 'pedagogico.conselho.manage') || $this->escopo->vinculado($user, $registro->turma_id, $registro->materia_id));
    }

    public function delete(User $user, PreConselho $registro): bool
    {
        return $this->doTenant($registro) && ($this->escopo->pode($user, 'pedagogico.conselho.manage') || $this->escopo->vinculado($user, $registro->turma_id, $registro->materia_id));
    }

    private function doTenant(PreConselho $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}

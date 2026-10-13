<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Policies;

use App\Models\User;
use App\Support\TenantContext;
use Modules\Pedagogico\Models\Ocorrencia;
use Modules\Pedagogico\Services\EscopoProfessor;

/** Ocorrências: escrita com pedagogico.ocorrencias.manage; o professor vê só as dos alunos das suas turmas. */
final class OcorrenciaPolicy
{
    public function __construct(private readonly EscopoProfessor $escopo) {}

    public function viewAny(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.view');
    }

    public function view(User $user, Ocorrencia $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.view') && (!$this->escopo->restrito($user) || $this->escopo->turmasDoProfessor($user)->contains($registro->aluno?->turma_id));
    }

    public function create(User $user): bool
    {
        return $this->escopo->pode($user, 'pedagogico.ocorrencias.manage');
    }

    public function update(User $user, Ocorrencia $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.ocorrencias.manage');
    }

    public function delete(User $user, Ocorrencia $registro): bool
    {
        return $this->doTenant($registro) && $this->escopo->pode($user, 'pedagogico.ocorrencias.manage');
    }

    private function doTenant(Ocorrencia $registro): bool
    {
        $context = app(TenantContext::class);

        return $context->hasTenant() && $registro->tenant_id === $context->id();
    }
}

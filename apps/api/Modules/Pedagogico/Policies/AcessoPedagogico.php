<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Policies;

use App\Models\User;
use Modules\Pedagogico\Services\EscopoProfessor;

/**
 * Abilities por turma × matéria (não há model a autorizar antes do lançamento). Registradas no provider:
 *   pedagogico.ver-turma, pedagogico.lancar-nota, pedagogico.preencher-ficha, pedagogico.registrar-frequencia.
 */
final class AcessoPedagogico
{
    public function __construct(private readonly EscopoProfessor $escopo) {}

    public function verTurma(User $user, int $turmaId): bool
    {
        if (!$this->escopo->pode($user, 'pedagogico.view')) {
            return false;
        }

        return !$this->escopo->restrito($user) || $this->escopo->vinculado($user, $turmaId);
    }

    public function lancarNota(User $user, int $turmaId, int $materiaId): bool
    {
        return $this->escopo->pode($user, 'pedagogico.notas.manage') || $this->escopo->vinculado($user, $turmaId, $materiaId);
    }

    public function preencherFicha(User $user, int $turmaId, int $materiaId): bool
    {
        return $this->escopo->pode($user, 'pedagogico.conselho.manage') || $this->escopo->vinculado($user, $turmaId, $materiaId);
    }

    public function registrarFrequencia(User $user, int $turmaId): bool
    {
        return $this->escopo->pode($user, 'pedagogico.frequencia.manage') || $this->escopo->vinculado($user, $turmaId);
    }
}

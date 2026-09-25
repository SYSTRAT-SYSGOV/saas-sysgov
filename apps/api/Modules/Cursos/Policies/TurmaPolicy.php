<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

/**
 * Instrutor opera só as turmas em que está designado (design D11): a
 * permissão cursos.instrutor sozinha não dá acesso a nenhuma turma.
 */
final class TurmaPolicy
{
    use PermissoesCursos;

    public function view(User $user, Turma $turma): bool
    {
        return $this->operar($user, $turma)
            || ($this->doTenant($turma) && $this->pode($user, 'cursos.view') && $turma->curso->statusEnum()->is(StatusCurso::Publicado));
    }

    /** Dados da turma (datas, vagas, modalidade, instrutores) e cancelamento. */
    public function update(User $user, Turma $turma): bool
    {
        return $this->doTenant($turma) && $this->administra($user);
    }

    /** Agendar aulas, chamada, QR de check-in, lista de inscritos, exportação e encerramento. */
    public function operar(User $user, Turma $turma): bool
    {
        if (!$this->doTenant($turma)) {
            return false;
        }

        return $this->administra($user)
            || ($this->pode($user, 'cursos.instrutor') && $turma->temInstrutor((int) $user->id));
    }

    public function inscrever(User $user, Turma $turma): bool
    {
        return $this->doTenant($turma) && $this->pode($user, 'cursos.participar');
    }

    /** Inscrição direta de outra pessoa na turma. */
    public function inscreverOutros(User $user, Turma $turma): bool
    {
        return $this->doTenant($turma) && $this->administra($user);
    }
}

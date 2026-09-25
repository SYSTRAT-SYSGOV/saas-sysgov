<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Enums\StatusCurso;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Models\Turma;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class CursoPolicy
{
    use PermissoesCursos;

    /** Listagem de gestão (todos os status). O catálogo do participante é outra rota. */
    public function viewAny(User $user): bool
    {
        return $this->administra($user);
    }

    public function view(User $user, Curso $curso): bool
    {
        if (!$this->doTenant($curso)) {
            return false;
        }

        if ($this->administra($user)) {
            return true;
        }

        if ($this->pode($user, 'cursos.view') && $curso->statusEnum()->is(StatusCurso::Publicado)) {
            return true;
        }

        return $this->pode($user, 'cursos.instrutor')
            && Turma::query()->where('curso_id', $curso->id)->whereHas('instrutores', fn ($q) => $q->where('users.id', $user->id))->exists();
    }

    public function create(User $user): bool
    {
        return $this->administra($user);
    }

    /** Editar, mudar status, capa e aulas. */
    public function update(User $user, Curso $curso): bool
    {
        return $this->doTenant($curso) && $this->administra($user);
    }

    public function delete(User $user, Curso $curso): bool
    {
        return $this->doTenant($curso) && $this->administra($user);
    }
}

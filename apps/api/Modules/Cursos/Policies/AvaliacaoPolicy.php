<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Curso;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

/**
 * Gerir avaliações e questões é do Administrador e passa pelo `update` do
 * CursoPolicy. Aqui ficam a listagem e a leitura de gestão, que o instrutor
 * das turmas do curso também tem (design D11 da Fase 2). O participante
 * chega às avaliações pela área dele (tentativas).
 */
final class AvaliacaoPolicy
{
    use PermissoesCursos;

    public function listar(User $user, Curso $curso): bool
    {
        return $this->doTenant($curso) && ($this->administra($user) || $this->instrutorDoCurso($user, $curso->id));
    }

    public function view(User $user, Avaliacao $avaliacao): bool
    {
        return $this->doTenant($avaliacao) && ($this->administra($user) || $this->instrutorDoCurso($user, $avaliacao->curso_id));
    }
}

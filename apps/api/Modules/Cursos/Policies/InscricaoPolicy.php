<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

final class InscricaoPolicy
{
    use PermissoesCursos;

    public function view(User $user, Inscricao $inscricao): bool
    {
        if (!$this->doTenant($inscricao)) {
            return false;
        }

        return $this->propria($user, $inscricao)
            || (new TurmaPolicy())->operar($user, $inscricao->turma);
    }

    public function cancelar(User $user, Inscricao $inscricao): bool
    {
        return $this->doTenant($inscricao) && ($this->administra($user) || $this->propria($user, $inscricao));
    }

    /** Aprovar ou recusar inscrição pendente. */
    public function decidir(User $user, Inscricao $inscricao): bool
    {
        return $this->doTenant($inscricao) && $this->administra($user);
    }

    private function propria(User $user, Inscricao $inscricao): bool
    {
        return $this->pode($user, 'cursos.participar') && $inscricao->participante->user_id === (int) $user->id;
    }
}

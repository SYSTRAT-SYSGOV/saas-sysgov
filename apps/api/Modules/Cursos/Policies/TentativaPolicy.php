<?php

declare(strict_types=1);

namespace Modules\Cursos\Policies;

use App\Models\User;
use Modules\Cursos\Models\Tentativa;
use Modules\Cursos\Policies\Concerns\PermissoesCursos;

/**
 * A tentativa é do participante que a fez: ver e responder só ele. Corrigir é
 * do Administrador e do instrutor designado na turma da inscrição (design D11).
 */
final class TentativaPolicy
{
    use PermissoesCursos;

    /** Ver e responder a própria tentativa. */
    public function responder(User $user, Tentativa $tentativa): bool
    {
        return $this->doTenant($tentativa)
            && $this->pode($user, 'cursos.participar')
            && $tentativa->inscricao->participante->user_id === (int) $user->id;
    }

    public function view(User $user, Tentativa $tentativa): bool
    {
        return $this->responder($user, $tentativa);
    }

    public function corrigir(User $user, Tentativa $tentativa): bool
    {
        return $this->doTenant($tentativa) && (new TurmaPolicy())->operar($user, $tentativa->inscricao->turma);
    }
}

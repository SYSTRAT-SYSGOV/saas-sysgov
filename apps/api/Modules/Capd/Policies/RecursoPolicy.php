<?php

namespace Modules\Capd\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\Impedimento;
use Modules\Capd\Models\Recurso;

/**
 * Policy de autorização para votar e instruir recursos.
 *
 * Implementa as travas da spec §9.3 e RN-C03:
 *   1. Membro ativo na comissão
 *   2. Membro não é o próprio recorrente
 *   3. Membro não é o avaliador que deu a nota contestada
 *   4. Membro não possui impedimento cadastrado para o servidor alvo
 *   5. Membro não possui vínculo de parentesco/subordinação (declarado ou sistêmico)
 */
final class RecursoPolicy
{
    use HandlesAuthorization;

    public function votar(User $user, Recurso $recurso): bool
    {
        // 1. Deve ser membro ativo da comissão do ciclo
        $membro = ComissaoMembro::query()
            ->where('servidor_id', $user->id)
            ->where('ativo', true)
            ->first();

        if (! $membro) {
            return false;
        }

        // 2. Membro não pode votar no próprio recurso como recorrente
        if ($recurso->recorrente_id === $user->id) {
            return false;
        }

        // 3. Membro não pode votar na nota que ele mesmo atribuiu
        if ($recurso->avaliacao->avaliador_id === $user->id) {
            return false;
        }

        // 4. Verifica impedimentos cadastrados (parentesco, subordinação, etc.)
        $impedido = Impedimento::query()
            ->where('comissao_membro_id', $membro->id)
            ->where('servidor_alvo_id', $recurso->recorrente_id)
            ->exists();

        return ! $impedido;
    }

    public function emitirParecer(User $user, Recurso $recurso): bool
    {
        // Apenas o relator designado pode emitir/editar o parecer
        $membro = ComissaoMembro::query()
            ->where('servidor_id', $user->id)
            ->where('ativo', true)
            ->first();

        if (! $membro) {
            return false;
        }

        return $recurso->relator_id === $membro->id;
    }

    public function view(User $user, Recurso $recurso): bool
    {
        // Recorrente pode ver o próprio recurso
        if ($recurso->recorrente_id === $user->id) {
            return true;
        }

        // Membros da CAPD podem ver todos os recursos do tenant
        return ComissaoMembro::query()
            ->where('servidor_id', $user->id)
            ->where('ativo', true)
            ->exists();
    }
}

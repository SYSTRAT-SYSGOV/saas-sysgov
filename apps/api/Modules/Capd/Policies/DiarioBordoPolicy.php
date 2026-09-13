<?php

declare(strict_types=1);

namespace Modules\Capd\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Capd\Models\DiarioBordo;

/**
 * Policy do Diário de Bordo (incidentes CIT).
 *
 * Regras:
 *   - Somente o avaliador pode criar registros para seus subordinados
 *   - O servidor pode visualizar seus próprios registros
 *   - Membros da CAPD têm leitura total
 *   - Exclusão: somente o avaliador criador, antes da homologação
 */
final class DiarioBordoPolicy
{
    use HandlesAuthorization;

    public function create(User $user, int $servidorId): bool
    {
        // Avaliador não pode registrar CIT para si mesmo
        if ($user->id === $servidorId) {
            return false;
        }

        return $user->hasPermissionTo('capd.diario_bordo.criar')
            || $user->hasRole(['admin_tenant', 'gestor_rh', 'avaliador_capd']);
    }

    public function view(User $user, DiarioBordo $diarioBordo): bool
    {
        // Servidor avaliado pode ver seus próprios incidentes
        if ($diarioBordo->servidor_id === $user->id) {
            return true;
        }

        // Avaliador que criou o registro
        if ($diarioBordo->avaliador_id === $user->id) {
            return true;
        }

        return $user->hasPermissionTo('capd.diario_bordo.visualizar');
    }

    public function update(User $user, DiarioBordo $diarioBordo): bool
    {
        // Somente o avaliador criador pode editar/adicionar evidências
        return $diarioBordo->avaliador_id === $user->id;
    }

    public function delete(User $user, DiarioBordo $diarioBordo): bool
    {
        return $diarioBordo->avaliador_id === $user->id
            || $user->hasPermissionTo('capd.diario_bordo.excluir');
    }
}

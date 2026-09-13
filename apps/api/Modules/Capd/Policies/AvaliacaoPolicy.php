<?php

declare(strict_types=1);

namespace Modules\Capd\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\ComissaoMembro;

/**
 * Policy de Avaliação de Desempenho.
 *
 * Papéis relevantes:
 *   - avaliador (chefia imediata) → cria/edita avaliações dos subordinados
 *   - membro_capd               → homologa avaliações, acessa tudo no tenant
 *   - servidor                  → visualiza apenas a própria avaliação
 */
final class AvaliacaoPolicy
{
    use HandlesAuthorization;

    public function view(User $user, Avaliacao $avaliacao): bool
    {
        // Servidor pode ver a própria avaliação
        if ($avaliacao->servidor_id === $user->id) {
            return true;
        }

        // Avaliador pode ver avaliações que criou
        if ($avaliacao->avaliador_id === $user->id) {
            return true;
        }

        // Membros da CAPD têm acesso total no tenant
        return $this->isMembro($user);
    }

    public function create(User $user): bool
    {
        // Qualquer usuário com papel de avaliador pode criar
        return $user->hasPermissionTo('capd.avaliacoes.criar')
            || $user->hasRole(['admin_tenant', 'gestor_rh']);
    }

    public function update(User $user, Avaliacao $avaliacao): bool
    {
        // Somente o avaliador original pode editar (enquanto não homologada)
        return $avaliacao->avaliador_id === $user->id
            && ! $avaliacao->homologada;
    }

    public function homologar(User $user): bool
    {
        // Somente membros ativos da CAPD podem homologar
        return $this->isMembro($user)
            || $user->hasPermissionTo('capd.avaliacoes.homologar');
    }

    private function isMembro(User $user): bool
    {
        return ComissaoMembro::query()
            ->where('servidor_id', $user->id)
            ->where('ativo', true)
            ->exists();
    }
}

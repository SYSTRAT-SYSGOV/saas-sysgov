<?php

declare(strict_types=1);

namespace Modules\Escola\Policies;

use App\Models\User;
use Modules\Escola\Models\CategoriaOcorrencia;
use Modules\Escola\Policies\Concerns\PermissoesEscola;

/** Categorias de ocorrência: escrita com escola.estrutura.manage. */
final class CategoriaOcorrenciaPolicy
{
    use PermissoesEscola;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, 'escola.view');
    }

    public function view(User $user, CategoriaOcorrencia $categoria): bool
    {
        return $this->doTenant($categoria) && $this->pode($user, 'escola.view');
    }

    public function create(User $user): bool
    {
        return $this->pode($user, 'escola.estrutura.manage');
    }

    public function update(User $user, CategoriaOcorrencia $categoria): bool
    {
        return $this->doTenant($categoria) && $this->pode($user, 'escola.estrutura.manage');
    }

    public function delete(User $user, CategoriaOcorrencia $categoria): bool
    {
        return $this->doTenant($categoria) && $this->pode($user, 'escola.estrutura.manage');
    }
}

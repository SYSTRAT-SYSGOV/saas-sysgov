<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Modules\Campanha\Policies\Concerns\PermissoesCampanha;

/**
 * Policy de recurso com uma permissão para ver e outra para escrever. O registro de outra campanha nem chega aqui
 * (CampanhaAware → 404); o de outro tenant é recusado.
 */
abstract class PermissaoSimplesPolicy
{
    use PermissoesCampanha;

    abstract protected function ver(): string;

    abstract protected function gerir(): string;

    public function viewAny(User $user): bool
    {
        return $this->pode($user, $this->ver());
    }

    public function view(User $user, Model $registro): bool
    {
        return $this->doTenant($registro) && $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $this->pode($user, $this->gerir());
    }

    public function update(User $user, Model $registro): bool
    {
        return $this->doTenant($registro) && $this->create($user);
    }

    public function delete(User $user, Model $registro): bool
    {
        return $this->update($user, $registro);
    }

    /** Baixar o arquivo anexado (comprovante, imagem, foto): por padrão, quem vê o registro. */
    public function arquivo(User $user, Model $registro): bool
    {
        return $this->view($user, $registro);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Inservivel\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Modules\Inservivel\Policies\Concerns\PermissoesInservivel;

/** Policy de recurso com uma permissão para ver e outra para escrever; registro de outro tenant é recusado. */
abstract class PermissaoSimplesPolicy
{
    use PermissoesInservivel;

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
}

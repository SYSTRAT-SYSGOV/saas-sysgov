<?php

declare(strict_types=1);

namespace Modules\Campanha\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/** Materiais e remessas: ver com campanha.view; escrever e baixar imagens/fotos com campanha.materiais.manage. */
final class MaterialPolicy extends PermissaoSimplesPolicy
{
    protected function ver(): string
    {
        return 'campanha.view';
    }

    protected function gerir(): string
    {
        return 'campanha.materiais.manage';
    }

    /** Imagem do material e foto da entrega: só quem gerencia os materiais (spec: Comprovantes anexados). */
    public function arquivo(User $user, Model $registro): bool
    {
        return $this->update($user, $registro);
    }
}

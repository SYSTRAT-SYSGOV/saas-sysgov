<?php

declare(strict_types=1);

namespace Modules\Inservivel\Support;

use Illuminate\Http\Request;
use Modules\Inservivel\Models\Entidade;

/** A entidade do portal vem sempre do usuário logado, nunca de um id da requisição (D7). */
final class EntidadeAtual
{
    public function de(Request $request): Entidade
    {
        $id = $request->user()?->getAuthIdentifier();
        $entidade = $id === null ? null : Entidade::query()->where('user_id', $id)->first();
        abort_unless($entidade instanceof Entidade, 404, 'Nenhuma entidade ligada a esta conta.');

        return $entidade;
    }
}

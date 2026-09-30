<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers\Concerns;

use Illuminate\Http\Request;

/** Autorização por permissão, sempre no servidor. */
trait AutorizaPermissao
{
    protected function autorizar(Request $request, string $permissao): void
    {
        abort_unless($request->user()?->hasPermission($permissao), 403, 'Sem permissão para esta ação.');
    }
}

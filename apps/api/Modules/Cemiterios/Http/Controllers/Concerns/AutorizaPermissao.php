<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers\Concerns;

use Illuminate\Http\Request;

/**
 * Autorização por permissão, sempre no servidor (RNF-10). O isolamento do
 * objeto por tenant vem do escopo global TenantAware: recurso de outro tenant
 * não é encontrado (404).
 */
trait AutorizaPermissao
{
    protected function autorizar(Request $request, string $permissao): void
    {
        abort_unless($request->user()?->hasPermission($permissao), 403, 'Sem permissão para esta ação.');
    }
}

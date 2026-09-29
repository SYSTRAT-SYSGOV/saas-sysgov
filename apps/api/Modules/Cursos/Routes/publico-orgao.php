<?php

declare(strict_types=1);

/*
 * Rotas públicas do módulo Cursos com o tenant vindo do {orgao} da URL (design D7) — página do
 * órgão, catálogo público e cadastro externo (Fase 3). O ResolvePublicTenant já definiu o
 * TenantContext antes de chegar aqui, então os models TenantAware filtram normalmente; os
 * controllers, ainda assim, só podem depender de Modules\Cursos\Services\Publico (teste de
 * arquitetura) — a resposta é sempre por lista explícita de campos, nunca toArray() de model.
 */

use Illuminate\Support\Facades\Route;
use Modules\Cursos\Http\Controllers\Publico\CadastroExternoController;
use Modules\Cursos\Http\Controllers\Publico\OrgaoController;
use Modules\Cursos\Http\Controllers\Publico\PedidoNovoLinkController;

Route::get('/', OrgaoController::class);
Route::post('/cadastro', CadastroExternoController::class);
Route::post('/pedir-novo-link', PedidoNovoLinkController::class);

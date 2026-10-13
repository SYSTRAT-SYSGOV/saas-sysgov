<?php

declare(strict_types=1);

/*
 * Rotas públicas do módulo Campanha (formulário de captação) — SEM login e SEM TenantContext.
 *
 * Sem TenantContext o TenantAware não filtra: qualquer consulta a um model do módulo feita daqui
 * enxergaria todos os clientes. Por isso os controllers destas rotas (Http/Controllers/Publico) só
 * dependem do CadastroPublicoService, que define o tenant e a campanha a partir do link (D2).
 * O teste de arquitetura do módulo falha se isso for violado.
 */

use Illuminate\Support\Facades\Route;
use Modules\Campanha\Http\Controllers\Publico\CadastroPublicoController;

Route::get('/links/{codigo}', [CadastroPublicoController::class, 'formulario'])->where('codigo', '[0-9A-Za-z]{16}');
Route::post('/links/{codigo}/cadastros', [CadastroPublicoController::class, 'cadastrar'])->where('codigo', '[0-9A-Za-z]{16}')
    ->middleware('throttle:campanha-cadastro');

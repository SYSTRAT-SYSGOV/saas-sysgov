<?php

declare(strict_types=1);

/*
 * Cadastro público da entidade — prefixo api/public/inservivel/{tenantSlug}, SEM login (D7).
 *
 * O ResolveTenantPublicoInservivel define o tenant pelo slug e o limpa ao final. Os controllers destas rotas
 * (Http/Controllers/Publico) só dependem do CadastroEntidadeService; o teste de arquitetura do módulo falha se
 * consultarem models do módulo diretamente.
 */

use Illuminate\Support\Facades\Route;
use Modules\Inservivel\Http\Controllers\Publico\CadastroPublicoController;

Route::get('/formulario', [CadastroPublicoController::class, 'formulario']);
Route::post('/entidades', [CadastroPublicoController::class, 'cadastrar']);

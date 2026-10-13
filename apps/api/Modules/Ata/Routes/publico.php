<?php

declare(strict_types=1);

/*
 * Validação pública da ata — prefixo api/public/ata/{tenantSlug}, SEM login. O ResolveTenantPublicoAta define o
 * tenant pelo slug e o limpa ao final. Só confirma a autenticidade: nunca devolve texto, participantes nem PDF.
 */

use Illuminate\Support\Facades\Route;
use Modules\Ata\Http\Controllers\Publico\ValidacaoController;

Route::get('/validar/{codigo}', ValidacaoController::class)->where('codigo', '[A-Za-z0-9-]{1,40}');

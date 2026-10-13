<?php

declare(strict_types=1);

/*
 * Escolas do órgão — sob api/escola, SEM o middleware `escola` (o usuário ainda não escolheu a
 * escola de trabalho) e sem module-access: "minhas" serve aos quatro módulos de educação, e o
 * cadastro é protegido pela EscolaPolicy (escola.escolas.manage).
 */

use Illuminate\Support\Facades\Route;
use Modules\Escola\Http\Controllers\EscolaController;

Route::get('/escolas/minhas', [EscolaController::class, 'minhas']);
Route::get('/escolas/unidades-organograma', [EscolaController::class, 'unidadesOrganograma']);
Route::get('/escolas', [EscolaController::class, 'index']);
Route::post('/escolas', [EscolaController::class, 'store']);
Route::put('/escolas/{escola}', [EscolaController::class, 'update']);
Route::post('/escolas/{escola}/logo', [EscolaController::class, 'logo']);

<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Ata\Http\Controllers\AssinaturaController;
use Modules\Ata\Http\Controllers\AtaController;
use Modules\Ata\Http\Controllers\AuditoriaController;
use Modules\Ata\Http\Controllers\CadastroController;
use Modules\Ata\Http\Controllers\DocumentoController;
use Modules\Ata\Http\Controllers\IaController;

/* Rotas internas do módulo Ata — prefixo api/ata (auth:sanctum + tenant + module-access). */

Route::pattern('ata', '[0-9]+');
Route::pattern('participante', '[0-9]+');
Route::pattern('tipo', '[0-9]+');
Route::pattern('orgUnit', '[0-9]+');

Route::get('/opcoes', [CadastroController::class, 'opcoes']);
Route::get('/pessoas', [CadastroController::class, 'pessoas']);
Route::get('/auditoria', AuditoriaController::class);

// Cadastros (ata.manage)
Route::get('/tipos', [CadastroController::class, 'tipos']);
Route::post('/tipos', [CadastroController::class, 'salvarTipo']);
Route::put('/tipos/{tipo}', [CadastroController::class, 'salvarTipo']);
Route::delete('/tipos/{tipo}', [CadastroController::class, 'excluirTipo']);
Route::get('/secretarias', [CadastroController::class, 'secretarias']);
Route::post('/secretarias/{orgUnit}', [CadastroController::class, 'salvarSecretaria']);
Route::get('/secretarias/{orgUnit}/timbrado', [CadastroController::class, 'timbrado']);

// Atas
Route::get('/atas', [AtaController::class, 'index']);
Route::post('/atas', [AtaController::class, 'store']);
Route::get('/atas/{ata}', [AtaController::class, 'show']);
Route::put('/atas/{ata}', [AtaController::class, 'update']);
Route::delete('/atas/{ata}', [AtaController::class, 'destroy']);
Route::put('/atas/{ata}/conteudo', [AtaController::class, 'conteudo']);
Route::post('/atas/{ata}/rascunho', [AtaController::class, 'rascunho']);
Route::post('/atas/{ata}/ia', IaController::class);

// Assinaturas
Route::get('/atas/{ata}/assinaturas/pendentes', [AssinaturaController::class, 'pendentes']);
Route::post('/atas/{ata}/assinaturas', [AssinaturaController::class, 'store']);
Route::get('/atas/{ata}/participantes/{participante}/assinatura', [AssinaturaController::class, 'imagem']);

// Documento
Route::get('/atas/{ata}/preview', [DocumentoController::class, 'preview']);
Route::post('/atas/{ata}/finalizar', [DocumentoController::class, 'finalizar']);
Route::get('/atas/{ata}/pdf', [DocumentoController::class, 'pdf']);

<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\Capd\Http\Controllers\Api\CapdEmbedController;

// Rotas de Injeção e Embed Headless para Terceiros
Route::post('/token', [CapdEmbedController::class, 'generateToken'])->name('capd.embed.token');
Route::get('/context', [CapdEmbedController::class, 'getEmbedContext'])->name('capd.embed.context');

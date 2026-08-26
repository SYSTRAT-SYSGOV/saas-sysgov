<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Modules\TestModule\Http\Controllers\TestModuleController;

Route::get('/', [TestModuleController::class, 'index'])->name('testmodule.index');
Route::post('/', [TestModuleController::class, 'store'])->name('testmodule.store');
Route::get('/{id}', [TestModuleController::class, 'show'])->name('testmodule.show');
Route::put('/{id}', [TestModuleController::class, 'update'])->name('testmodule.update');
Route::delete('/{id}', [TestModuleController::class, 'destroy'])->name('testmodule.destroy');
<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('sysgov:about', function (): void {
    $this->info('SYSGOV API - modular Laravel platform');
})->purpose('Exibe informações da plataforma SYSGOV');

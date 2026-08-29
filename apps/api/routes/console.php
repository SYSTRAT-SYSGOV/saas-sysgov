<?php

use App\Console\Commands\ExpireAccess;
use App\Console\Commands\NotifyExpiringAccess;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('sysgov:about', function (): void {
    $this->info('SYSGOV API - modular Laravel platform');
})->purpose('Exibe informações da plataforma SYSGOV');

Schedule::command(ExpireAccess::class)->dailyAt('03:00');
Schedule::command(NotifyExpiringAccess::class)->dailyAt('07:00');

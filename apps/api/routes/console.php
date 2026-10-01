<?php

use App\Console\Commands\ExpireAccess;
use App\Console\Commands\NotifyExpiringAccess;
use App\Console\Commands\ProcessOutbox;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Modules\Cursos\Console\Commands\LimparCadastrosPendentesCommand;

Artisan::command('sysgov:about', function (): void {
    $this->info('SYSGOV API - modular Laravel platform');
})->purpose('Exibe informações da plataforma SYSGOV');

Schedule::command(ExpireAccess::class)->dailyAt('03:00');
Schedule::command(NotifyExpiringAccess::class)->dailyAt('07:00');
Schedule::command(LimparCadastrosPendentesCommand::class)->dailyAt('04:00');
// O lockForUpdate do próprio outbox:process já impede processamento duplicado; withoutOverlapping
// é só economia (evita empilhar execuções se uma demorar mais que um minuto).
Schedule::command(ProcessOutbox::class, ['--limit=100'])->everyMinute()->withoutOverlapping();

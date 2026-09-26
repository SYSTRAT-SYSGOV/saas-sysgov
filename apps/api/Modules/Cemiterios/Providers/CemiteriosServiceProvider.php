<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Providers;

use App\Events\OutboxMessage;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Mail\MailServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Modules\Cemiterios\Console;
use Modules\Cemiterios\Listeners\EnviarEmail;
use Modules\Cemiterios\Models\Concessionario;

final class CemiteriosServiceProvider extends ServiceProvider
{
    /** Comando => frequência (design D10), fuso America/Sao_Paulo. */
    private const AGENDA = [
        Console\ExpirarConcessoes::class => ['dailyAt', '00:30'],
        Console\AtualizarAptidao::class => ['dailyAt', '00:45'],
        Console\GerarGuiasAnuais::class => ['yearlyOn', 1, 1, '01:00'],
        Console\LiberarRemocoes::class => ['dailyAt', '01:30'],
        Console\NotificarVencimentos::class => ['dailyAt', '07:00'],
    ];

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'cemiterios');
        $this->app->register(RouteServiceProvider::class);

        // Guard do portal do concessionário: token Sanctum emitido após o login Gov.br (D8).
        config([
            'auth.guards.concessionario' => ['driver' => 'sanctum', 'provider' => 'concessionarios'],
            'auth.providers.concessionarios' => ['driver' => 'eloquent', 'model' => Concessionario::class],
        ]);
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        // E-mails pela Outbox. A plataforma não registra o MailServiceProvider; o módulo o garante.
        if (!$this->app->bound('mail.manager')) {
            $this->app->register(MailServiceProvider::class);
        }
        Event::listen(OutboxMessage::class, EnviarEmail::class);

        if (!$this->app->runningInConsole()) {
            return;
        }

        $this->commands([
            ...array_keys(self::AGENDA),
            Console\ReajustarPrecos::class,
            Console\MigrarClipperCommand::class,
            Console\CorrigirDatasMigradasCommand::class,
        ]);

        $this->callAfterResolving(Schedule::class, function (Schedule $schedule): void {
            foreach (self::AGENDA as $comando => $frequencia) {
                $metodo = array_shift($frequencia);
                $schedule->command($comando)->{$metodo}(...$frequencia)
                    ->timezone('America/Sao_Paulo')->withoutOverlapping()->onOneServer();
            }

            // Reajuste anual em 1º/dez, com novas tentativas diárias até 31/dez (idempotente por competência).
            $schedule->command(Console\ReajustarPrecos::class)->cron('0 2 1-31 12 *')
                ->timezone('America/Sao_Paulo')->withoutOverlapping()->onOneServer();
        });
    }
}

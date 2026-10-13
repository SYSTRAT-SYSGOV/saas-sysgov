<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Providers;

use App\Events\OutboxMessage;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Modules\MeioAmbiente\Listeners\EnviarParaOrgaoControleListener;

final class MeioAmbienteServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');

        Event::listen(OutboxMessage::class, EnviarParaOrgaoControleListener::class);
    }

    public function register(): void
    {
        $this->app->register(RouteServiceProvider::class);
    }
}
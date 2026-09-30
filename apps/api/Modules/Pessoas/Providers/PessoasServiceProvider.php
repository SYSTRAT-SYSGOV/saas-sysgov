<?php

declare(strict_types=1);

namespace Modules\Pessoas\Providers;

use App\Events\OutboxMessage;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Pessoas\Listeners\ImportarPessoaListener;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Policies\PessoaPolicy;

final class PessoasServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
        Event::listen(OutboxMessage::class, ImportarPessoaListener::class);
        Gate::policy(Pessoa::class, PessoaPolicy::class);
    }

    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../Config/config.php', 'pessoas');
        $this->app->register(RouteServiceProvider::class);
        $this->app->register(AuthServiceProvider::class);
    }
}
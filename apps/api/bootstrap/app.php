<?php

declare(strict_types=1);

use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\EnsurePlatformAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Configuration\Exceptions;
use App\Console\Commands\MakeModule;
use App\Console\Commands\ProcessOutbox;
use Modules\Admin\Providers\AdminServiceProvider;
use Modules\Contracts\Providers\ContractsServiceProvider;
use Modules\Finance\Providers\FinanceServiceProvider;
use Laravel\Tinker\TinkerServiceProvider;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withProviders([AdminServiceProvider::class, ContractsServiceProvider::class, FinanceServiceProvider::class, TinkerServiceProvider::class])
    ->withCommands([MakeModule::class, ProcessOutbox::class])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->alias(['tenant' => ResolveTenant::class, 'platform-admin' => EnsurePlatformAdmin::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {})
    ->create();

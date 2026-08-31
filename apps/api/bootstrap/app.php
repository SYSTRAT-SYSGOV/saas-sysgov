<?php

declare(strict_types=1);

use App\Http\Middleware\ResolveTenant;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureModuleAccess;
use App\Http\Middleware\EnsureAdminTenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Configuration\Exceptions;
use App\Console\Commands\MakeModule;
use App\Console\Commands\ProcessOutbox;
use App\Console\Commands\ExpireAccess;
use App\Console\Commands\NotifyExpiringAccess;
use Modules\Admin\Providers\AdminServiceProvider;
use Modules\Contracts\Providers\ContractsServiceProvider;
use Modules\Finance\Providers\FinanceServiceProvider;
use Modules\OrgChart\Providers\OrgChartServiceProvider;
use Modules\Procurement\Providers\ProcurementServiceProvider;
use Modules\TestModule\Providers\TestModuleServiceProvider;
use Laravel\Tinker\TinkerServiceProvider;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withProviders([
        AdminServiceProvider::class,
        ContractsServiceProvider::class,
        FinanceServiceProvider::class,
        OrgChartServiceProvider::class,
        ProcurementServiceProvider::class,
        TestModuleServiceProvider::class,
        TinkerServiceProvider::class,
        \App\Providers\AuthServiceProvider::class,
    ])
    ->withCommands([MakeModule::class, ProcessOutbox::class, ExpireAccess::class, NotifyExpiringAccess::class, SeedModuleOrgUnit::class])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->alias([
            'tenant' => ResolveTenant::class,
            'platform-admin' => EnsurePlatformAdmin::class,
            'module-access' => EnsureModuleAccess::class,
            'admin-tenant' => EnsureAdminTenant::class,
            'mfa' => \Modules\Admin\Http\Middleware\EnsureMfa::class,
            'bindings' => \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {})
    ->create();

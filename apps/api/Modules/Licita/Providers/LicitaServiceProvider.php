<?php

declare(strict_types=1);

namespace Modules\Licita\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Modules\Licita\Models\CampoConfiguracao;
use Modules\Licita\Models\Dfd;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Models\Processo;
use Modules\Licita\Policies\CampoConfiguracaoPolicy;
use Modules\Licita\Policies\DfdPolicy;
use Modules\Licita\Policies\LegalDocumentoPolicy;
use Modules\Licita\Policies\ProcessoPolicy;

final class LicitaServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Gate::policy(Processo::class, ProcessoPolicy::class);
        Gate::policy(Dfd::class, DfdPolicy::class);
        Gate::policy(LegalDocumento::class, LegalDocumentoPolicy::class);
        Gate::policy(CampoConfiguracao::class, CampoConfiguracaoPolicy::class);
        $this->loadRoutesFrom(__DIR__ . '/../Routes/api.php');
        $this->loadMigrationsFrom(__DIR__ . '/../Database/Migrations');
    }
}

<?php

declare(strict_types=1);

namespace Modules\Protocolo\Console;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Modules\Protocolo\Database\Seeders\TiposTramitacaoDefaultSeeder;

final class SeedTiposTramitacaoCommand extends Command
{
    protected $signature = 'protocolo:seed-tipos {--tenant= : ID ou slug do tenant específico}';
    protected $description = 'Semeia os tipos de tramitação padrão do módulo Protocolo para tenants de forma idempotente';

    public function handle(TiposTramitacaoDefaultSeeder $seeder): int
    {
        $tenantInput = $this->option('tenant');

        if ($tenantInput !== null) {
            $tenant = is_numeric($tenantInput)
                ? Tenant::find((int) $tenantInput)
                : Tenant::where('slug', (string) $tenantInput)->first();

            if ($tenant === null) {
                $this->error("Tenant '{$tenantInput}' não encontrado.");
                return self::FAILURE;
            }

            $seeder->seedParaTenant($tenant);
            $this->info("Tipos de tramitação semeados com sucesso para o tenant [{$tenant->name}].");
            return self::SUCCESS;
        }

        $seeder->run();
        $this->info("Tipos de tramitação semeados com sucesso para todos os tenants.");
        return self::SUCCESS;
    }
}

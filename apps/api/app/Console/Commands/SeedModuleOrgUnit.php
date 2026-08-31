<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TenantModuleOrgUnit;
use Illuminate\Console\Command;
use Modules\Admin\Models\Module;

final class SeedModuleOrgUnit extends Command
{
    protected $signature = 'sysgov:seed-module-org-units {--tenant= : ID do tenant específico}';

    protected $description = 'Semeia TenantModuleOrgUnit com valores padrão: todas as secretarias têm todos os módulos habilitados por padrão.';

    public function handle(): int
    {
        $tenantId = $this->option('tenant');

        $tenants = $tenantId
            ? [Tenant::findOrFail((int) $tenantId)]
            : Tenant::all();

        $bar = $this->output->createProgressBar($tenants->count());

        foreach ($tenants as $tenant) {
            $modules = Module::query()
                ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id)->where('tenant_module.enabled', true))
                ->get();

            if ($modules->isEmpty()) {
                $this->warn("Nenhum módulo habilitado para o tenant {$tenant->id}.");
                $bar->advance();
                continue;
            }

            foreach ($modules as $module) {
                $this->seedForTenantModule($tenant, $module);
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Seed de granularidade concluído.');

        return self::SUCCESS;
    }

    private function seedForTenantModule(Tenant $tenant, Module $module): void
    {
        $unitTypeClause = 'secretaria,departamento,raiz';

        $units = \Modules\OrgChart\Models\OrgUnit::query()
            ->where('tenant_id', $tenant->id)
            ->when($unitTypeClause, function ($q) use ($unitTypeClause): void {
                $types = array_map('trim', explode(',', $unitTypeClause));
                $q->whereIn('type', $types);
            })
            ->pluck('id')
            ->all();

        foreach ($units as $unitId) {
            TenantModuleOrgUnit::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'module_id' => $module->id,
                    'org_unit_id' => $unitId,
                ],
                [
                    'enabled' => true,
                    'inherited' => false,
                ]
            );
        }
    }
}

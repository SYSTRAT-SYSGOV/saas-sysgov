<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Modules\Admin\Models\Module;

/**
 * Libera todos os módulos do catálogo no tenant interno SYSTRAT.
 *
 * Sem isso, num banco recém-criado o tenant_module fica vazio, o /auth/me
 * devolve modules: [] e o Painel do Cliente mostra "Acesso Negado" até para
 * o super_admin (a rota "/" exige o módulo "dashboard").
 *
 * Só age se o SYSTRAT ainda não tiver nenhum módulo vinculado: depois disso
 * a configuração é do Admin Suite, e o boot não pode desfazer o que foi
 * desmarcado lá. Roda no docker-entrypoint.sh depois do module:register
 * (e não no DatabaseSeeder) para já enxergar os módulos registrados via
 * module.json (capd, client, admin), que não existem na hora do db:seed.
 */
final class SystratModulesSeeder extends Seeder
{
    public function run(): void
    {
        $sysTenant = Tenant::where('slug', 'systrat')->first();

        if (!$sysTenant) {
            $this->command?->warn('Tenant SYSTRAT inexistente — rode o RbacSeeder antes.');
            return;
        }

        if ($sysTenant->modules()->exists()) {
            $this->command?->info('SYSTRAT já tem módulos vinculados — nada a fazer.');
            return;
        }

        $pivot = [];
        foreach (Module::query()->pluck('id') as $moduleId) {
            $pivot[$moduleId] = ['enabled' => true, 'monthly_fee_cents' => 0, 'settings' => json_encode([])];
        }
        $sysTenant->modules()->attach($pivot);

        $this->command?->info(count($pivot) . ' módulos liberados no tenant SYSTRAT.');
    }
}

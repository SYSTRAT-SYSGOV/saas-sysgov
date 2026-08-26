<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Admin\Models\Module;

final class ModuleCatalogSeeder extends Seeder
{
    /**
     * Catálogo de módulos SaaS com preço base mensal em centavos.
     * O preço por tenant pode ser sobrescrito em tenant_module.monthly_fee_cents.
     */
    public function run(): void
    {
        $catalog = [
            ['name' => 'Painel Geral', 'alias' => 'dashboard', 'monthly_fee_cents' => 0, 'description' => 'Visão geral, KPIs e indicadores do município.'],
            ['name' => 'Organograma', 'alias' => 'org', 'monthly_fee_cents' => 14900, 'description' => 'Estrutura hierárquica municipal (gabinete, secretarias, departamentos).'],
            ['name' => 'Licitações & Compras', 'alias' => 'procurement', 'monthly_fee_cents' => 29900, 'description' => 'Pregões, processo licitatório e salas de lances.'],
            ['name' => 'Contratos & Aditivos', 'alias' => 'contracts', 'monthly_fee_cents' => 24900, 'description' => 'Gestão de contratos, aditivos, medições e pagamentos.'],
            ['name' => 'Execução Financeira', 'alias' => 'finance', 'monthly_fee_cents' => 29900, 'description' => 'Receitas, despesas, empenhos e conciliação.'],
            ['name' => 'Usuários & Acessos', 'alias' => 'users', 'monthly_fee_cents' => 9900, 'description' => 'Gestão de usuários e papéis do tenant.'],
            ['name' => 'Módulo Pedagógico', 'alias' => 'pedagogico', 'monthly_fee_cents' => 19900, 'description' => 'Gestão escolar e pedagógica.'],
            ['name' => 'Recursos Humanos / Folha', 'alias' => 'rh', 'monthly_fee_cents' => 24900, 'description' => 'RH, folha de pagamento e frequência.'],
            ['name' => 'Gestão de Cemitérios', 'alias' => 'cemiterios', 'monthly_fee_cents' => 14900, 'description' => 'Administração de cemitérios e sepultamentos.'],
        ];

        foreach ($catalog as $data) {
            Module::updateOrCreate(
                ['alias' => $data['alias']],
                ['name' => $data['name'], 'monthly_fee_cents' => $data['monthly_fee_cents'], 'description' => $data['description'], 'enabled' => true]
            );
        }

        $this->command?->info('Catálogo de módulos SaaS semeado.');
    }
}

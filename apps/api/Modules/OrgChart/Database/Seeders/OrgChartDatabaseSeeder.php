<?php

declare(strict_types=1);

namespace Modules\OrgChart\Database\Seeders;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Services\OrgTreeService;

final class OrgChartDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenants = Tenant::all();
        $treeService = app(OrgTreeService::class);
        $context = app(TenantContext::class);

        foreach ($tenants as $tenant) {
            $context->set($tenant);

            if (OrgUnit::roots()->exists()) {
                continue;
            }

            // 1. Raiz Municipal
            $root = $treeService->createUnit([
                'name' => "Gabinete do Prefeito — {$tenant->name}",
                'code' => 'GAB',
                'acronym' => 'GAB',
                'type' => 'raiz',
                'metadata' => [
                    'description' => 'Órgão executivo superior da administração municipal.',
                ],
            ]);

            // 2. Secretarias Estratégicas
            $secAdmin = $treeService->createUnit([
                'name' => 'Secretaria Municipal de Administração',
                'code' => 'SMA',
                'acronym' => 'SMA',
                'type' => 'secretaria',
                'parent_id' => $root->id,
            ]);

            $secFinancas = $treeService->createUnit([
                'name' => 'Secretaria Municipal de Finanças & Planejamento',
                'code' => 'SMF',
                'acronym' => 'SMF',
                'type' => 'secretaria',
                'parent_id' => $root->id,
            ]);

            $secObras = $treeService->createUnit([
                'name' => 'Secretaria Municipal de Obras Públicas & Urbanismo',
                'code' => 'SMOP',
                'acronym' => 'SMOP',
                'type' => 'secretaria',
                'parent_id' => $root->id,
            ]);

            $secSaude = $treeService->createUnit([
                'name' => 'Secretaria Municipal de Saúde',
                'code' => 'SMS',
                'acronym' => 'SMS',
                'type' => 'secretaria',
                'parent_id' => $root->id,
            ]);

            $secEducacao = $treeService->createUnit([
                'name' => 'Secretaria Municipal de Educação',
                'code' => 'SMED',
                'acronym' => 'SMED',
                'type' => 'secretaria',
                'parent_id' => $root->id,
            ]);

            // 3. Departamentos e Divisões sob Administração
            $deptCompras = $treeService->createUnit([
                'name' => 'Departamento de Compras e Licitações',
                'code' => 'DCL',
                'acronym' => 'DCL',
                'type' => 'departamento',
                'parent_id' => $secAdmin->id,
            ]);

            $treeService->createUnit([
                'name' => 'Divisão de Pregão Eletrônico',
                'code' => 'DPE',
                'acronym' => 'DPE',
                'type' => 'divisao',
                'parent_id' => $deptCompras->id,
            ]);

            $treeService->createUnit([
                'name' => 'Divisão de Gestão de Contratos',
                'code' => 'DGC',
                'acronym' => 'DGC',
                'type' => 'divisao',
                'parent_id' => $deptCompras->id,
            ]);

            // 4. Departamentos sob Finanças
            $deptContab = $treeService->createUnit([
                'name' => 'Departamento de Contabilidade e Orçamento',
                'code' => 'DCO',
                'acronym' => 'DCO',
                'type' => 'departamento',
                'parent_id' => $secFinancas->id,
            ]);

            $treeService->createUnit([
                'name' => 'Divisão de Execução Orçamentária',
                'code' => 'DEO',
                'acronym' => 'DEO',
                'type' => 'divisao',
                'parent_id' => $deptContab->id,
            ]);
        }

        $context->clear();
    }
}

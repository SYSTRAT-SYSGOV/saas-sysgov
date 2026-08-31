<?php

declare(strict_types=1);

namespace Modules\Client\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;

final class ClientMenuSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            [
                'name' => 'GESTÃO FISCAL & ORÇAMENTÁRIA',
                'slug' => 'gestao-fiscal',
                'icon' => 'PieChart',
                'order' => 1,
                'items' => [
                    ['label' => 'Painel Geral', 'route' => '/', 'icon' => 'LayoutDashboard', 'permission' => 'dashboard.view', 'module_alias' => 'dashboard'],
                    ['label' => 'Licitações', 'route' => '/licitacoes', 'icon' => 'FileText', 'permission' => 'procurement.view', 'module_alias' => 'procurement'],
                    ['label' => 'Contratos', 'route' => '/contratos', 'icon' => 'FileSignature', 'permission' => 'contracts.view', 'module_alias' => 'contracts'],
                    ['label' => 'Execução Financeira', 'route' => '/financeiro', 'icon' => 'Coins', 'permission' => 'finance.view', 'module_alias' => 'finance'],
                ],
            ],
            [
                'name' => 'GESTÃO SETORIAL',
                'slug' => 'gestao-setorial',
                'icon' => 'Building2',
                'order' => 2,
                'items' => [
                    ['label' => 'Organograma Municipal', 'route' => '/organograma', 'icon' => 'Network', 'permission' => 'org.view', 'module_alias' => 'org'],
                    ['label' => 'Módulo Pedagógico', 'route' => '/pedagogico', 'icon' => 'GraduationCap', 'permission' => 'pedagogico.view', 'module_alias' => 'pedagogico'],
                    ['label' => 'Recursos Humanos / Folha', 'route' => '/rh', 'icon' => 'Users', 'permission' => 'rh.view', 'module_alias' => 'rh'],
                    ['label' => 'Gestão de Cemitérios', 'route' => '/cemiterios', 'icon' => 'Cross', 'permission' => 'cemiterios.view', 'module_alias' => 'cemiterios'],
                ],
            ],
            [
                'name' => 'SISTEMA',
                'slug' => 'sistema',
                'icon' => 'Settings',
                'order' => 99,
                'items' => [
                    ['label' => 'Gerenciar Menus', 'route' => '/gerenciar-menus', 'icon' => 'Menu', 'permission' => 'menu.manager', 'module_alias' => null],
                    ['label' => 'Usuários e Acessos', 'route' => '/usuarios', 'icon' => 'Users', 'permission' => 'users.manage', 'module_alias' => 'users'],
                    ['label' => 'Reset de Senha', 'route' => '/reset-senha', 'icon' => 'Key', 'permission' => 'users.password.reset', 'module_alias' => 'users'],
                    ['label' => 'Hierarquias', 'route' => '/hierarquias', 'icon' => 'GitBranch', 'permission' => 'org.admin', 'module_alias' => 'org'],
                ],
            ],
        ];

        foreach ($groups as $g) {
            $items = $g['items'];
            unset($g['items']);

            $group = ClientMenuGroup::updateOrCreate(
                ['slug' => $g['slug']],
                array_merge($g, ['is_active' => true, 'tenant_id' => null])
            );

            $group->items()->delete();

            foreach ($items as $order => $item) {
                $group->items()->create(array_merge($item, ['order' => $order, 'is_active' => true]));
            }
        }
    }
}

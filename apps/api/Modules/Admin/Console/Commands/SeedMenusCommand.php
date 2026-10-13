<?php

declare(strict_types=1);

namespace Modules\Admin\Console\Commands;

use Illuminate\Console\Command;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;

final class SeedMenusCommand extends Command
{
    protected $signature = 'sysgov:seed-menus';
    protected $description = 'Popula a tabela de menus do SysGov com os grupos e itens padrão.';

    public function handle(): int
    {
        $groups = [
            [
                'name' => 'PAINEL PRINCIPAL',
                'slug' => 'painel-principal',
                'icon' => 'LayoutDashboard',
                'order' => 1,
                'items' => [
                    ['label' => 'Visão Geral & KPIs', 'route' => 'admin_dashboard', 'icon' => 'LayoutDashboard', 'shortcut' => '1', 'module_alias' => 'dashboard', 'order' => 1],
                    ['label' => 'Desempenho & Métricas', 'route' => 'admin_analytics', 'icon' => 'BarChart3', 'shortcut' => '2', 'module_alias' => 'analytics', 'order' => 2],
                ],
            ],
            [
                'name' => 'GESTÃO & CADASTROS',
                'slug' => 'gestao-cadastros',
                'icon' => 'Building2',
                'order' => 2,
                'items' => [
                    ['label' => 'Usuários & Permissões', 'route' => 'admin_users', 'icon' => 'Users', 'shortcut' => 'U', 'module_alias' => 'users', 'order' => 1],
                    ['label' => 'Organizações & Tenants', 'route' => 'admin_tenants', 'icon' => 'Building2', 'shortcut' => 'T', 'module_alias' => 'tenants', 'order' => 2],
                    ['label' => 'Registros & Tabelas', 'route' => 'admin_records', 'icon' => 'Table', 'shortcut' => 'R', 'module_alias' => 'records', 'order' => 3],
                    ['label' => 'Módulos da Plataforma', 'route' => 'module_catalog', 'icon' => 'Database', 'shortcut' => 'C', 'module_alias' => 'catalog', 'order' => 5],
                ],
            ],
            [
                'name' => 'FINANCEIRO & INFRAESTRUTURA',
                'slug' => 'financeiro-infra',
                'icon' => 'CreditCard',
                'order' => 3,
                'items' => [
                    ['label' => 'Faturamento & Invoices', 'route' => 'admin_billing', 'icon' => 'CreditCard', 'shortcut' => 'F', 'module_alias' => 'billing', 'order' => 1],
                    ['label' => 'APIs & Integrações', 'route' => 'admin_apis', 'icon' => 'Plug', 'shortcut' => 'I', 'module_alias' => 'apis', 'order' => 2],
                    ['label' => 'Logs & Auditoria', 'route' => 'admin_logs', 'icon' => 'ShieldAlert', 'shortcut' => 'L', 'module_alias' => 'compliance', 'order' => 3],
                ],
            ],
            [
                'name' => 'SISTEMA & PREFERÊNCIAS',
                'slug' => 'sistema-preferencias',
                'icon' => 'Settings',
                'order' => 4,
                'items' => [
                    ['label' => 'Configurações & White-Label', 'route' => 'admin_settings', 'icon' => 'Settings', 'module_alias' => 'settings', 'order' => 1],
                    ['label' => 'Configurações de IA', 'route' => 'admin_ai', 'icon' => 'Sparkles', 'module_alias' => 'ai', 'order' => 2],
                    ['label' => 'Meu Perfil & Segurança', 'route' => 'admin_profile', 'icon' => 'UserCheck', 'module_alias' => 'profile', 'order' => 3],
                ],
            ],
        ];

        // Remove grupo legado e itens mockados que não existem
        $legacyGroup = MenuGroup::where('slug', 'contratos-contabilidade')->first();
        if ($legacyGroup) {
            MenuItem::where('menu_group_id', $legacyGroup->getKey())->delete();
            $legacyGroup->delete();
        }
        MenuItem::whereIn('route', ['contratos', 'helpdesk', 'contabilidade'])->delete();

        foreach ($groups as $groupData) {
            $items = $groupData['items'];
            unset($groupData['items']);

            $group = MenuGroup::updateOrCreate(['slug' => $groupData['slug']], $groupData + ['is_active' => true]);

            foreach ($items as $item) {
                MenuItem::updateOrCreate(
                    ['menu_group_id' => $group->getKey(), 'route' => $item['route']],
                    array_merge(['menu_group_id' => $group->getKey(), 'is_active' => true], $item),
                );
            }
            $this->info("Grupo '{$group->getName()}' populado com ".count($items).' itens.');
        }

        return self::SUCCESS;
    }
}

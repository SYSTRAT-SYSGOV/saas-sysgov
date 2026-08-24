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
                    ['label' => 'Gerenciador de Menus', 'route' => 'admin_menus', 'icon' => 'Layers', 'shortcut' => 'M', 'module_alias' => 'menus', 'order' => 4],
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
                    ['label' => 'Meu Perfil & Segurança', 'route' => 'admin_profile', 'icon' => 'UserCheck', 'module_alias' => 'profile', 'order' => 2],
                ],
            ],
            [
                'name' => 'CONTRATOS & CONTABILIDADE',
                'slug' => 'contratos-contabilidade',
                'icon' => 'FileText',
                'order' => 5,
                'items' => [
                    ['label' => 'Gestão de Contratos', 'route' => 'contratos', 'icon' => 'FileText', 'module_alias' => 'contracts', 'order' => 1],
                    ['label' => 'Suporte & Helpdesk', 'route' => 'helpdesk', 'icon' => 'Ticket', 'module_alias' => 'support', 'order' => 2],
                    ['label' => 'Contabilidade Pública', 'route' => 'contabilidade', 'icon' => 'BookOpen', 'module_alias' => 'contabilidade', 'order' => 3],
                ],
            ],
        ];

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
            $this->info("Grupo '{$group->name}' populado com ".count($items).' itens.');
        }

        return self::SUCCESS;
    }
}

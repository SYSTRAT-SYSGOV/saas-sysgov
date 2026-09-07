<?php

declare(strict_types=1);

namespace Modules\Admin\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Modules\Admin\Models\MenuGroup;
use Modules\Admin\Models\MenuItem;
use Modules\Admin\Models\Module as PlatformModule;

final class RegisterModuleCommand extends Command
{
    protected $signature = 'module:register {module} {--force : Forçar recriação de permissões/menu existentes} {--dry-run : Simular sem persistir}';
    protected $description = 'Registra um módulo no catálogo da plataforma: permissões, menu e catálogo de módulos (a partir do module.json)';

    public function handle(): int
    {
        $moduleName = (string) $this->argument('module');
        $force = $this->option('force');
        $dryRun = $this->option('dry-run');

        $modulePath = base_path("Modules/{$moduleName}");

        if (!File::exists($modulePath)) {
            $this->error("Módulo '{$moduleName}' não encontrado em Modules/{$moduleName}.");
            return self::FAILURE;
        }

        $moduleJsonPath = $modulePath . '/module.json';
        if (!File::exists($moduleJsonPath)) {
            $this->error("Arquivo module.json não encontrado em {$modulePath}.");
            return self::FAILURE;
        }

        $moduleConfig = json_decode(File::get($moduleJsonPath), true);

        if (!is_array($moduleConfig)) {
            $this->error("module.json inválido.");
            return self::FAILURE;
        }

        $alias = $moduleConfig['alias'] ?? 'sem alias';
        $this->info("Registrando módulo: {$moduleName} ({$alias})");

        if ($dryRun) {
            $this->warn('Modo DRY-RUN: nenhuma alteração será persistida.');
        }

        return DB::transaction(function () use ($moduleName, $moduleConfig, $force, $dryRun): int {
            // 1. Registrar/Atualizar módulo no catálogo da plataforma
            $platformModule = $this->registerPlatformModule($moduleName, $moduleConfig, $dryRun);

            // 2. Criar/Atualizar permissões padrão do módulo
            $this->registerModulePermissions($moduleConfig, $force, $dryRun);

            // 3. Criar/Atualizar grupos e itens de menu
            $this->registerModuleMenu($moduleConfig, $force, $dryRun);

            $this->info("✓ Módulo '{$moduleName}' registrado com sucesso!");
            $this->info("  - Catálogo: {$platformModule->name} (alias: {$platformModule->alias})");
            $this->info("  - Permissões: criadas/atualizadas");
            $this->info("  - Menu: grupos/itens criados/atualizados");

            return self::SUCCESS;
        });
    }

    private function registerPlatformModule(string $moduleName, array $config, bool $dryRun): PlatformModule
    {
        $alias = $config['alias'] ?? Str::lower($moduleName);

        if ($dryRun) {
            $this->info("[DRY-RUN] Criaria/atualizaria Module: name={$moduleName}, alias={$alias}");
            return new PlatformModule(['name' => $moduleName, 'alias' => $alias]);
        }

        $module = PlatformModule::updateOrCreate(
            ['alias' => $alias],
            [
                'name' => $config['name'] ?? $moduleName,
                'description' => $config['description'] ?? '',
                'metadata' => array_merge(
                    $config['metadata'] ?? [],
                    ['priority' => $config['priority'] ?? 10]
                ),
                'enabled' => $config['enabled'] ?? true,
                'monthly_fee_cents' => $config['monthly_fee_cents'] ?? 0,
            ]
        );

        $this->info("  ✓ Módulo de plataforma: {$module->name} ({$module->alias})");

        return $module;
    }

    private function registerModulePermissions(array $config, bool $force, bool $dryRun): void
    {
        $alias = $config['alias'] ?? '';
        if (!$alias) {
            $this->warn('  Sem alias no module.json — pulando criação de permissões.');
            return;
        }

        // Permissões padrão CRUD baseadas no alias
        $defaultPermissions = [
            "{$alias}.view" => "Visualizar {$config['name']}",
            "{$alias}.create" => "Criar {$config['name']}",
            "{$alias}.update" => "Atualizar {$config['name']}",
            "{$alias}.delete" => "Excluir {$config['name']}",
        ];

        // Permissões customizadas do module.json (se houver)
        $customPermissions = $config['permissions'] ?? [];

        $allPermissions = array_merge($defaultPermissions, $customPermissions);

        foreach ($allPermissions as $slug => $name) {
            if ($dryRun) {
                $this->info("  [DRY-RUN] Permissão: {$slug} => {$name}");
                continue;
            }

            $perm = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'module' => $alias, 'guard_name' => 'web']
            );

            $action = $perm->wasRecentlyCreated ? 'criada' : ($force ? 'atualizada' : 'existente');
            $this->info("  ✓ Permissão {$action}: {$slug}");
        }
    }

    private function registerModuleMenu(array $config, bool $force, bool $dryRun): void
    {
        $menuConfig = $config['menu'] ?? null;
        if (!$menuConfig) {
            $this->warn('  Sem configuração de menu no module.json — pulando.');
            return;
        }

        $groupName = $menuConfig['label'] ?? $config['name'];
        $groupSlug = Str::slug($groupName);
        $groupIcon = $menuConfig['icon'] ?? 'Layers';
        $groupOrder = $menuConfig['order'] ?? 50;
        $groupPermission = $menuConfig['permission'] ?? null;

        if ($dryRun) {
            $this->info("  [DRY-RUN] Menu Group: {$groupName} (slug: {$groupSlug})");
            return;
        }

        $group = MenuGroup::updateOrCreate(
            ['slug' => $groupSlug],
            [
                'name' => $groupName,
                'icon' => $groupIcon,
                'order' => $groupOrder,
                'is_active' => true,
            ]
        );

        $this->info("  ✓ Menu Group: {$group->getName()} ({$group->getSlug()})");

        // Itens de menu padrão baseados no alias
        $alias = $config['alias'] ?? '';
        if ($alias) {
            $defaultItems = [
                [
                    'label' => "Visualizar {$config['name']}",
                    'route' => $alias,
                    'icon' => $groupIcon,
                    'shortcut' => Str::upper(Str::substr($alias, 0, 1)),
                    'module_alias' => $alias,
                    'permission' => "{$alias}.view",
                    'order' => 1,
                ],
            ];

            foreach ($defaultItems as $itemData) {
                MenuItem::updateOrCreate(
                    ['menu_group_id' => $group->getKey(), 'route' => $itemData['route']],
                    array_merge(['menu_group_id' => $group->getKey(), 'is_active' => true], $itemData),
                );
                $this->info("  ✓ Menu Item: {$itemData['label']} ({$itemData['route']})");
            }
        }
    }
}
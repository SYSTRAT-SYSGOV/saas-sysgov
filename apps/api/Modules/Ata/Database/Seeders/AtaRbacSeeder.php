<?php

declare(strict_types=1);

namespace Modules\Ata\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Ata — Gestor de Atas, Secretário(a) de Atas e Consulta. Mesmo padrão dos demais módulos:
 * perfis-modelo no tenant interno da SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado.
 */
final class AtaRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'ata.view' => 'Consultar as atas das secretarias em que está lotado',
        'ata.create' => 'Criar atas e redigir o texto',
        'ata.sign' => 'Colher assinaturas dos participantes',
        'ata.finalize' => 'Finalizar a ata e gerar o PDF oficial',
        'ata.manage' => 'Gerenciar todas as atas (inclusive sigilosas), tipos de ata e configuração das secretarias',
        'ata.audit' => 'Consultar a auditoria do módulo',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'ata_gestor' => [
            'name' => 'Gestor de Atas',
            'description' => 'Acesso total: todas as secretarias, atas sigilosas, tipos de ata, timbrados e auditoria',
            'permissions' => ['ata.view', 'ata.create', 'ata.sign', 'ata.finalize', 'ata.manage', 'ata.audit'],
        ],
        'ata_secretario' => [
            'name' => 'Secretário(a) de Atas',
            'description' => 'Redige, colhe assinaturas e finaliza as atas das secretarias em que está lotado',
            'permissions' => ['ata.view', 'ata.create', 'ata.sign', 'ata.finalize'],
        ],
        'ata_consulta' => [
            'name' => 'Consulta de Atas',
            'description' => 'Consulta as atas das secretarias em que está lotado',
            'permissions' => ['ata.view'],
        ],
    ];

    public function run(): void
    {
        $sysTenant = Tenant::updateOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        $permissionIds = [];
        foreach (self::PERMISSOES as $slug => $name) {
            $permissionIds[$slug] = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'module' => 'ata', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'ata',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );
            $ids = array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions']);
            $role->permissions()->sync($ids);

            // Perfis já clonados em tenants recebem as permissões novas (só acrescenta).
            Role::query()->where('slug', $slug)->where('tenant_id', '!=', $sysTenant->id)
                ->each(fn (Role $clone) => $clone->permissions()->syncWithoutDetaching($ids));
        }

        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info('Ata: permissões e perfis-template (Gestor, Secretário(a), Consulta) semeados.');
        }
    }
}

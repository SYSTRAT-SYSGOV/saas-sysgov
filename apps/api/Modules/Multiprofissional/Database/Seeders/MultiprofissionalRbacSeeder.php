<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Multiprofissional — Coordenação, Profissional e Consulta. Mesmo padrão dos demais módulos:
 * perfis-modelo no tenant interno da SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado.
 */
final class MultiprofissionalRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'multiprofissional.view' => 'Consultar equipes, profissionais, estudantes acompanhados (sem dados clínicos) e atendimentos',
        'multiprofissional.atender' => 'Registrar atendimentos e editar os próprios',
        'multiprofissional.acompanhar' => 'Gerir estudantes acompanhados, condições (CID) e laudos',
        'multiprofissional.manage' => 'Gerenciar cadastros, profissionais, equipes e todos os atendimentos (inclusive sigilosos)',
        'multiprofissional.audit' => 'Consultar a auditoria do módulo',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'multiprofissional_coordenacao' => [
            'name' => 'Coordenação Multiprofissional',
            'description' => 'Acesso total: cadastros, profissionais, equipes, todos os atendimentos (inclusive sigilosos) e auditoria',
            'permissions' => ['multiprofissional.view', 'multiprofissional.atender', 'multiprofissional.acompanhar', 'multiprofissional.manage', 'multiprofissional.audit'],
        ],
        'multiprofissional_profissional' => [
            'name' => 'Profissional Multiprofissional',
            'description' => 'Registra atendimentos e acompanha estudantes (condições e laudos)',
            'permissions' => ['multiprofissional.view', 'multiprofissional.atender', 'multiprofissional.acompanhar'],
        ],
        'multiprofissional_consulta' => [
            'name' => 'Consulta Multiprofissional',
            'description' => 'Consulta equipes, profissionais, estudantes acompanhados e atendimentos, sem dados clínicos',
            'permissions' => ['multiprofissional.view'],
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
                ['name' => $name, 'module' => 'multiprofissional', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'multiprofissional',
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
            $this->command->info('Multiprofissional: permissões e perfis-template (Coordenação, Profissional, Consulta) semeados.');
        }
    }
}

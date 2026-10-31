<?php

declare(strict_types=1);

namespace Modules\Transporte\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Transporte — Coordenação, Operador e Consulta. Mesmo padrão dos demais módulos: perfis-modelo no
 * tenant interno da SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado.
 */
final class TransporteRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'transporte.view' => 'Consultar frota, rotas, alocações e painel do transporte escolar',
        'transporte.frota.manage' => 'Gerir empresas, motoristas, veículos e vistorias',
        'transporte.rotas.manage' => 'Gerir paradas, rotas e itinerários',
        'transporte.alocacoes.manage' => 'Alocar e encerrar alunos em rotas',
        'transporte.alocacoes.override_capacity' => 'Alocar acima da capacidade do veículo, com justificativa',
        'transporte.censo.export' => 'Pré-validar e exportar o Registro 60 do Censo Escolar',
        'transporte.audit' => 'Consultar a auditoria do módulo',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'transporte_coordenacao' => [
            'name' => 'Coordenação de Transporte',
            'description' => 'Acesso total: frota, rotas, alocações (inclusive acima da capacidade), Censo e auditoria',
            'permissions' => [
                'transporte.view', 'transporte.frota.manage', 'transporte.rotas.manage', 'transporte.alocacoes.manage',
                'transporte.alocacoes.override_capacity', 'transporte.censo.export', 'transporte.audit',
            ],
        ],
        'transporte_operador' => [
            'name' => 'Operador de Transporte',
            'description' => 'Gere frota, rotas, alocações e o Censo, sem exceção de capacidade nem auditoria',
            'permissions' => ['transporte.view', 'transporte.frota.manage', 'transporte.rotas.manage', 'transporte.alocacoes.manage', 'transporte.censo.export'],
        ],
        'transporte_consulta' => [
            'name' => 'Consulta de Transporte',
            'description' => 'Consulta frota, rotas, alocações e painel',
            'permissions' => ['transporte.view'],
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
                ['name' => $name, 'module' => 'transporte', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'transporte',
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
            $this->command->info('Transporte: permissões e perfis-template (Coordenação, Operador, Consulta) semeados.');
        }
    }
}

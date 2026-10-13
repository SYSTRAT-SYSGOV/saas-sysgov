<?php

declare(strict_types=1);

namespace Modules\Protocolo\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Services\ModuleRoleProvisioner;
use Illuminate\Database\Seeder;
use Modules\Admin\Models\Module;

/**
 * Perfis e permissões do módulo Protocolo (Processos Administrativos).
 *
 * Registra as permissões, templates de roles (scope=tenant, module='protocolo')
 * no tenant interno da SYSTRAT, e provisiona para os tenants ativos.
 */
final class ProtocoloRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'protocolo.processos.view' => 'Visualizar processos administrativos',
        'protocolo.processos.create' => 'Criar processo administrativo',
        'protocolo.processos.update' => 'Editar dados e anexar documentos ao processo',
        'protocolo.processos.tramitar' => 'Tramitar e encaminhar processos entre órgãos',
        'protocolo.processos.vincular' => 'Vincular entidades e processos',
        'protocolo.processos.promover_requerimento' => 'Promover requerimento a processo administrativo',
        'protocolo.processos.rastrear' => 'Consultar localização e situação em tempo real',
        'protocolo.processos.relatorios' => 'Acessar dashboard e relatórios do protocolo',
        'protocolo.processos.delete' => 'Excluir (soft delete) processos administrativos',
        'protocolo.tipos_tramitacao.manage' => 'Gerenciar tipos de tramitação',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'admin_protocolo' => [
            'name' => 'Administrador de Protocolo',
            'description' => 'Acesso total ao módulo de Protocolo e gestão de tipos de tramitação',
            'permissions' => [
                'protocolo.processos.view',
                'protocolo.processos.create',
                'protocolo.processos.update',
                'protocolo.processos.tramitar',
                'protocolo.processos.vincular',
                'protocolo.processos.promover_requerimento',
                'protocolo.processos.rastrear',
                'protocolo.processos.relatorios',
                'protocolo.processos.delete',
                'protocolo.tipos_tramitacao.manage',
            ],
        ],
        'atendente_protocolo' => [
            'name' => 'Atendente de Protocolo',
            'description' => 'Abertura de novos processos, anexação de documentos e vinculação',
            'permissions' => [
                'protocolo.processos.view',
                'protocolo.processos.create',
                'protocolo.processos.update',
                'protocolo.processos.vincular',
                'protocolo.processos.rastrear',
            ],
        ],
        'tramitador_protocolo' => [
            'name' => 'Tramitador de Protocolo',
            'description' => 'Encaminhamento, recebimento de processos e consulta a relatórios',
            'permissions' => [
                'protocolo.processos.view',
                'protocolo.processos.tramitar',
                'protocolo.processos.rastrear',
                'protocolo.processos.relatorios',
            ],
        ],
        'consulta_protocolo' => [
            'name' => 'Consulta de Protocolo',
            'description' => 'Apenas consulta e rastreamento de processos administrativos',
            'permissions' => [
                'protocolo.processos.view',
                'protocolo.processos.rastrear',
            ],
        ],
    ];

    public function run(): void
    {
        $sysTenant = Tenant::firstOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        $permissionIds = [];
        foreach (self::PERMISSOES as $slug => $name) {
            $permissionIds[$slug] = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'module' => 'protocolo', 'guard_name' => 'web']
            )->id;
        }

        // Criar perfis-template no tenant interno SYSTRAT
        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'protocolo',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync(
                array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions'])
            );
        }

        // Garante que o módulo Protocolo existe no catálogo da plataforma
        $protocoloModule = Module::firstOrCreate(
            ['alias' => 'protocolo'],
            [
                'name' => 'Protocolo',
                'description' => 'Núcleo genérico de processos administrativos municipais — tramitação externa/interna, rastreabilidade, vinculação polimórfica e controle de prazos.',
                'enabled' => true,
                'monthly_fee_cents' => 0,
            ]
        );

        // Habilita o módulo Protocolo nos tenants existentes e provisiona as roles
        $provisioner = app(ModuleRoleProvisioner::class);
        $allTenants = Tenant::all();

        foreach ($allTenants as $tenant) {
            $tenant->modules()->syncWithoutDetaching([
                $protocoloModule->id => [
                    'enabled' => true,
                    'monthly_fee_cents' => 0,
                    'settings' => json_encode([]),
                ],
            ]);

            $provisioner->provisionForTenant($tenant, 'protocolo');
        }

        $this->informar('Protocolo: permissões, papéis-template e ativação em todos os tenants concluídos.');
    }

    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}

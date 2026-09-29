<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Permissões cemiterios.* (module.json) e os 5 perfis padrão do DRS §4 como
 * roles-template (scope=tenant, module=cemiterios) no tenant SYSTRAT. O
 * ModuleRoleProvisioner clona os perfis para cada tenant que habilita o módulo;
 * lá eles ficam editáveis na Gestão de Perfis do painel do cliente (design D12).
 */
final class CemiteriosRbacSeeder extends Seeder
{
    /** @var array<string, array{name: string, description: string, permissions: list<string>|string}> */
    public const PERFIS = [
        'cemiterios_admin_geral' => [
            'name' => 'Cemitérios — Administrador Geral',
            'description' => 'Gestor municipal: acesso total, configuração de regras e auditoria',
            'permissions' => '*',
        ],
        'cemiterios_operador' => [
            'name' => 'Cemitérios — Operador Administrativo',
            'description' => 'Registra operações, concessões e consultas',
            'permissions' => [
                'cemiterios.view', 'cemiterios.inventario.manage', 'cemiterios.operacoes.create',
                'cemiterios.operacoes.historico', 'cemiterios.concessoes.manage', 'cemiterios.empreiteiros.manage',
            ],
        ],
        'cemiterios_fiscal' => [
            'name' => 'Cemitérios — Fiscal de Campo',
            'description' => 'Vistorias in loco, fotos, alteração de status e processos de abandono',
            'permissions' => ['cemiterios.view', 'cemiterios.vistoria.create', 'cemiterios.abandono.manage', 'cemiterios.gis.edit'],
        ],
        'cemiterios_coveiro' => [
            'name' => 'Cemitérios — Coveiro/Operacional',
            'description' => 'Consulta ordens de serviço e confirma a execução',
            'permissions' => ['cemiterios.view', 'cemiterios.operacoes.executar'],
        ],
        'cemiterios_financeiro' => [
            'name' => 'Cemitérios — Financeiro',
            'description' => 'Tabela de preços, reajuste, guias, baixas e relatórios',
            'permissions' => ['cemiterios.view', 'cemiterios.financeiro.manage', 'cemiterios.financeiro.reajuste'],
        ],
    ];

    public function run(): void
    {
        $sysTenant = Tenant::updateOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        $modulo = json_decode((string) file_get_contents(__DIR__ . '/../../module.json'), true);
        $ids = [];
        foreach ($modulo['permissions'] as $slug => $nome) {
            $ids[$slug] = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $nome, 'module' => 'cemiterios', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'description' => $perfil['description'],
                    'scope' => 'tenant',
                    'module' => 'cemiterios',
                    'is_system' => true,
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync(
                $perfil['permissions'] === '*' ? array_values($ids) : array_map(fn (string $p) => $ids[$p], $perfil['permissions'])
            );
        }

        $this->concederLeituraDeCadastroParaQuemJaGerencia($ids);
    }

    /**
     * `cemiterios.cadastros.view` é uma permissão nova: qualquer papel, em
     * qualquer tenant, que já possua `cemiterios.cadastros.manage` passa a
     * receber a leitura automaticamente, para não regredir o acesso de quem já
     * gerenciava o cadastro (design.md - Migration Plan #3).
     *
     * @param array<string, int> $ids
     */
    private function concederLeituraDeCadastroParaQuemJaGerencia(array $ids): void
    {
        if (!isset($ids['cemiterios.cadastros.view'], $ids['cemiterios.cadastros.manage'])) {
            return;
        }

        $viewId = $ids['cemiterios.cadastros.view'];
        $manageId = $ids['cemiterios.cadastros.manage'];

        Role::whereHas('permissions', fn ($q) => $q->where('permissions.id', $manageId))
            ->get()
            ->each(fn (Role $role) => $role->permissions()->syncWithoutDetaching([$viewId]));
    }
}

<?php

declare(strict_types=1);

namespace Modules\Capd\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis (roles) e permissões do módulo CAPD — Comissão, RH, Chefia
 * Imediata, Servidor Avaliado e Auditoria/Controle Interno.
 *
 * Segue exatamente o padrão de database/Seeders/RbacSeeder.php: roles
 * "template" com scope=tenant, associadas ao tenant interno da SYSTRAT
 * (reaproveitáveis por qualquer tenant cliente via atribuição normal de
 * role a usuário), is_system=true por serem papéis estruturais do módulo.
 *
 * As permissions capd.* já estavam declaradas em module.json mas nunca
 * haviam sido cadastradas na tabela `permissions` nem associadas a
 * nenhuma role — as policies do módulo (AvaliacaoPolicy, etc.) já
 * esperavam roles como 'avaliador', 'membro_capd' e 'gestor_rh', mas
 * elas não existiam no banco.
 */
final class CapdRbacSeeder extends Seeder
{
    public function run(): void
    {
        $sysTenant = Tenant::updateOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        $permissions = [
            'capd.view'                  => 'Visualizar CAPD',
            'capd.ciclos.view'           => 'Visualizar Ciclos de Avaliação',
            'capd.ciclos.manage'         => 'Gerenciar Ciclos de Avaliação',
            'capd.cit.create'            => 'Criar Apontamentos no Diário de Bordo (CIT)',
            'capd.cit.view'              => 'Visualizar Diário de Bordo (CIT)',
            'capd.avaliacao.create'      => 'Criar/Editar Avaliações',
            'capd.avaliacao.view'        => 'Visualizar Avaliações',
            'capd.recurso.create'        => 'Interpor Recurso',
            'capd.recurso.view'          => 'Visualizar Recursos',
            'capd.recurso.julgar'        => 'Julgar Recursos (Comissão)',
            'capd.sessao.view'           => 'Visualizar Sessões da Comissão',
            'capd.sessao.manage'         => 'Gerenciar Sessões da Comissão',
            'capd.comissao.manage'       => 'Gerenciar Membros da Comissão',
            'capd.homologacao.executar'  => 'Executar Homologação em Lote',
            'capd.dashboard.view'        => 'Visualizar Dashboard CAPD',
            'capd.admin.parametrizar'    => 'Parametrizar Módulo (fatores, pesos, escala, quinquênios, consolidação)',
            'capd.hierarquia.view'       => 'Visualizar Configuração de Hierarquia',
            'capd.hierarquia.manage'     => 'Gerenciar Configuração de Hierarquia',
            'capd.pendencias.view'       => 'Visualizar Pendências de Hierarquia',
            'capd.pendencias.resolver'   => 'Resolver Pendências de Hierarquia',
        ];

        $createdPermissions = [];
        foreach ($permissions as $slug => $name) {
            $perm = Permission::updateOrCreate(
                ['slug' => $slug],
                ['name' => $name, 'module' => 'capd', 'guard_name' => 'web']
            );
            $createdPermissions[$slug] = $perm->id;
        }

        $rolesData = [
            'membro_capd' => [
                'name'        => 'Comissão de Avaliação (CAD)',
                'slug'        => 'membro_capd',
                'description' => 'Julga recursos, homologa avaliações, gerencia ciclos/sessões e parametriza o módulo',
                'permissions' => [
                    'capd.view', 'capd.ciclos.view', 'capd.ciclos.manage', 'capd.cit.view',
                    'capd.avaliacao.view', 'capd.recurso.view', 'capd.recurso.julgar',
                    'capd.sessao.view', 'capd.sessao.manage', 'capd.comissao.manage',
                    'capd.homologacao.executar', 'capd.dashboard.view', 'capd.admin.parametrizar',
                    'capd.pendencias.view',
                ],
            ],
            'gestor_rh' => [
                'name'        => 'RH — Gestão de Desempenho',
                'slug'        => 'gestor_rh',
                'description' => 'Administra hierarquia de avaliação, resolve pendências e acompanha o ciclo',
                'permissions' => [
                    'capd.view', 'capd.ciclos.view', 'capd.avaliacao.view', 'capd.dashboard.view',
                    'capd.pendencias.view', 'capd.pendencias.resolver',
                    'capd.hierarquia.view', 'capd.hierarquia.manage', 'capd.admin.parametrizar',
                ],
            ],
            'avaliador' => [
                'name'        => 'Chefia Imediata (Avaliador)',
                'slug'        => 'avaliador',
                'description' => 'Avalia subordinados na Escala Gráfica e registra o Diário de Bordo (CIT)',
                'permissions' => [
                    'capd.view', 'capd.cit.create', 'capd.cit.view',
                    'capd.avaliacao.create', 'capd.avaliacao.view', 'capd.recurso.view',
                ],
            ],
            'servidor' => [
                'name'        => 'Servidor Avaliado',
                'slug'        => 'servidor',
                'description' => 'Consulta a própria avaliação, dá ciência e interpõe recurso',
                'permissions' => [
                    'capd.view', 'capd.avaliacao.view', 'capd.cit.view', 'capd.recurso.create',
                ],
            ],
            'auditoria_capd' => [
                'name'        => 'Auditoria e Controle Interno',
                'slug'        => 'auditoria_capd',
                'description' => 'Acesso de fiscalização somente-leitura: impedimentos, trilha de auditoria e pendências',
                'permissions' => [
                    'capd.view', 'capd.dashboard.view', 'capd.pendencias.view',
                ],
            ],
        ];

        foreach ($rolesData as $roleData) {
            $role = Role::updateOrCreate(
                ['slug' => $roleData['slug'], 'tenant_id' => $sysTenant->id],
                [
                    'name'        => $roleData['name'],
                    'scope'       => 'tenant',
                    'module'      => 'capd',
                    'is_system'   => true,
                    'description' => $roleData['description'],
                    'guard_name'  => 'web',
                ]
            );

            $role->permissions()->sync($this->resolveIds($createdPermissions, $roleData['permissions']));
        }

        $this->command?->info('CAPD RBAC seeded: permissions e roles (membro_capd, gestor_rh, avaliador, servidor, auditoria_capd) criadas.');
    }

    /**
     * @param array<string, int> $createdPermissions
     * @param list<string> $slugs
     * @return list<int>
     */
    private function resolveIds(array $createdPermissions, array $slugs): array
    {
        $ids = [];
        foreach ($slugs as $slug) {
            if (isset($createdPermissions[$slug])) {
                $ids[] = $createdPermissions[$slug];
            }
        }
        return $ids;
    }
}

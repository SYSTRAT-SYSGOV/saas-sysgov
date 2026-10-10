<?php

declare(strict_types=1);

namespace Modules\Campanha\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Campanha — Coordenação Geral, Coordenação de Campanha, Financeiro de Campanha e Consulta.
 *
 * Mesmo padrão dos demais módulos: perfis-modelo (scope=tenant, module='campanha') no tenant interno da
 * SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado. Quem tem
 * campanha.gestao.manage acessa todas as campanhas do tenant; os demais, só as de que são membros.
 */
final class CampanhaRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'campanha.view' => 'Acessar o módulo Campanha Política',
        'campanha.gestao.manage' => 'Gerenciar campanhas, candidatos, membros e configuração (acessa todas as campanhas)',
        'campanha.municipios.manage' => 'Alterar os dados dos municípios na campanha',
        'campanha.equipes.manage' => 'Gerenciar coordenadores, cabos eleitorais, prefeitos e vereadores',
        'campanha.eleitores.view' => 'Ver os dados pessoais dos eleitores captados',
        'campanha.eleitores.manage' => 'Gerenciar links de captação, exportar e excluir eleitores',
        'campanha.demandas.manage' => 'Gerenciar as demandas dos municípios',
        'campanha.materiais.manage' => 'Gerenciar materiais, estoque e remessas',
        'campanha.financeiro.view' => 'Ver o livro-caixa e os comprovantes financeiros',
        'campanha.financeiro.manage' => 'Lançar, alterar e excluir no livro-caixa',
        'campanha.agenda.manage' => 'Gerenciar eventos, reuniões e visitas',
        'campanha.pesquisas.manage' => 'Gerenciar as pesquisas eleitorais',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'campanha_coordenacao_geral' => [
            'name' => 'Coordenação Geral de Campanha',
            'description' => 'Acesso total a todas as campanhas, inclusive o financeiro',
            'permissions' => [
                'campanha.view', 'campanha.gestao.manage', 'campanha.municipios.manage', 'campanha.equipes.manage', 'campanha.eleitores.view', 'campanha.eleitores.manage',
                'campanha.demandas.manage', 'campanha.materiais.manage', 'campanha.financeiro.view', 'campanha.financeiro.manage', 'campanha.agenda.manage', 'campanha.pesquisas.manage',
            ],
        ],
        'campanha_coordenacao' => [
            'name' => 'Coordenação de Campanha',
            'description' => 'Municípios, equipes, eleitores, demandas, materiais, agenda e pesquisas nas campanhas de que é membro (sem o financeiro)',
            'permissions' => [
                'campanha.view', 'campanha.municipios.manage', 'campanha.equipes.manage', 'campanha.eleitores.view', 'campanha.eleitores.manage',
                'campanha.demandas.manage', 'campanha.materiais.manage', 'campanha.agenda.manage', 'campanha.pesquisas.manage',
            ],
        ],
        'campanha_financeiro' => [
            'name' => 'Financeiro de Campanha',
            'description' => 'Livro-caixa e comprovantes nas campanhas de que é membro',
            'permissions' => ['campanha.view', 'campanha.financeiro.view', 'campanha.financeiro.manage'],
        ],
        'campanha_consulta' => [
            'name' => 'Consulta de Campanha',
            'description' => 'Consulta as campanhas de que é membro (sem dados pessoais de eleitores e sem o financeiro)',
            'permissions' => ['campanha.view'],
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
                ['name' => $name, 'module' => 'campanha', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'campanha',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $ids = array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions']);
            $role->permissions()->sync($ids);

            // Perfis já clonados em tenants recebem as permissões novas (só acrescenta: não desfaz personalizações).
            Role::query()->where('slug', $slug)->where('tenant_id', '!=', $sysTenant->id)
                ->each(fn (Role $clone) => $clone->permissions()->syncWithoutDetaching($ids));
        }

        $this->informar('Campanha: permissões e perfis-template (Coordenação Geral, Coordenação, Financeiro, Consulta) semeados.');
    }


    /** $this->command é null quando o seeder é chamado direto (ex.: nos testes). */
    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}

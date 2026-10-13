<?php

declare(strict_types=1);

namespace Modules\Inservivel\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Inservível — Gestor do Patrimônio, Servidor de Secretaria e Entidade (D1).
 *
 * Mesmo padrão dos demais módulos: perfis-modelo (scope=tenant, module='inservivel') no tenant interno da
 * SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado. O perfil Entidade só tem o menu e o
 * portal: `inservivel.acesso` é separado de `inservivel.view` para que a entidade veja o item de menu sem
 * enxergar as rotas internas.
 */
final class InservivelRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'inservivel.acesso' => 'Ver o item de menu Inservível & Doações',
        'inservivel.view' => 'Consultar bens, lotes, entidades e transferências',
        'inservivel.bens.manage' => 'Cadastrar e editar bens inservíveis e suas fotos',
        'inservivel.lotes.manage' => 'Criar lotes e gerenciar os lotes que criou',
        'inservivel.lotes.gestao' => 'Gerenciar todos os lotes: status, sorteio e exclusão',
        'inservivel.entidades.manage' => 'Analisar e gerenciar as entidades sem fins lucrativos',
        'inservivel.transferencias.manage' => 'Anunciar, solicitar e cancelar transferências internas',
        'inservivel.transferencias.aprovar' => 'Aprovar ou recusar as solicitações de transferência interna',
        'inservivel.configuracao.manage' => 'Gerenciar parâmetros, configurações e importação',
        'inservivel.portal' => 'Acessar o portal da entidade',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'inservivel_gestor' => [
            'name' => 'Gestor do Patrimônio',
            'description' => 'Acesso total ao módulo: entidades, sorteio, aprovação de transferências, parâmetros e configurações',
            'permissions' => [
                'inservivel.acesso', 'inservivel.view', 'inservivel.bens.manage', 'inservivel.lotes.manage', 'inservivel.lotes.gestao',
                'inservivel.entidades.manage', 'inservivel.transferencias.manage', 'inservivel.transferencias.aprovar', 'inservivel.configuracao.manage',
            ],
        ],
        'inservivel_servidor' => [
            'name' => 'Servidor de Secretaria',
            'description' => 'Cadastra bens, gerencia os lotes que criou e anuncia ou solicita transferências pela sua secretaria',
            'permissions' => ['inservivel.acesso', 'inservivel.view', 'inservivel.bens.manage', 'inservivel.lotes.manage', 'inservivel.transferencias.manage'],
        ],
        'inservivel_entidade' => [
            'name' => 'Entidade (Inservível)',
            'description' => 'Entidade sem fins lucrativos: só o portal da entidade',
            'permissions' => ['inservivel.acesso', 'inservivel.portal'],
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
                ['name' => $name, 'module' => 'inservivel', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'inservivel',
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

        $this->informar('Inservível: permissões e perfis-template (Gestor do Patrimônio, Servidor de Secretaria, Entidade) semeados.');
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

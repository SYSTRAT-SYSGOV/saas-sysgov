<?php

declare(strict_types=1);

namespace Modules\Escola\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Escola — Direção e Secretaria/Pedagogia.
 *
 * Mesmo padrão do CursosRbacSeeder: perfis-modelo (scope=tenant, module='escola') no tenant
 * interno da SYSTRAT, clonados para o tenant pelo ModuleRoleProvisioner quando o módulo é
 * habilitado. Os slugs levam o prefixo do módulo porque o provisionador identifica o perfil
 * só pelo slug dentro do tenant. Roda no docker-entrypoint.sh a cada boot (idempotente).
 */
final class EscolaRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'escola.view' => 'Acessar o cadastro escolar (turmas, alunos, matérias e trimestres)',
        'escola.alunos.manage' => 'Cadastrar, editar, remanejar, importar e excluir alunos (Escola)',
        'escola.estrutura.manage' => 'Gerenciar unidade, turnos, turmas, matérias, professores, trimestres e categorias (Escola)',
        // Sem perfil padrão: por padrão só o administrador geral do tenant cadastra escolas.
        'escola.escolas.manage' => 'Cadastrar e gerenciar as escolas do órgão (Escola)',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'escola_direcao' => [
            'name' => 'Direção Escolar',
            'description' => 'Acesso total ao cadastro escolar: estrutura, turmas, matérias, trimestres e alunos',
            'permissions' => ['escola.view', 'escola.alunos.manage', 'escola.estrutura.manage'],
        ],
        'escola_secretaria' => [
            'name' => 'Secretaria / Pedagogia',
            'description' => 'Consulta o cadastro escolar e gerencia os alunos',
            'permissions' => ['escola.view', 'escola.alunos.manage'],
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
                ['name' => $name, 'module' => 'escola', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'escola',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync(array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions']));
        }

        $this->informar('Escola: permissões e perfis-template (Direção Escolar, Secretaria/Pedagogia) semeados.');
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

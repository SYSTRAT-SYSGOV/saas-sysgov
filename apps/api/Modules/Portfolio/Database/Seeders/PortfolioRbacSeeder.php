<?php

declare(strict_types=1);

namespace Modules\Portfolio\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do Portfólio — Professor e Gestão. Perfis-modelo (scope=tenant, module='portfolio') no tenant SYSTRAT,
 * clonados pelo ModuleRoleProvisioner quando o módulo é habilitado.
 */
final class PortfolioRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'portfolio.view' => 'Acessar o Portfólio Digital',
        'portfolio.professor' => 'Registrar trabalhos nas turmas e matérias em que é o professor vinculado (Portfólio)',
        'portfolio.manage' => 'Registrar, alterar e excluir trabalhos de qualquer turma e gerar relatórios (Portfólio)',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'portfolio_professor' => [
            'name' => 'Professor (Portfólio)',
            'description' => 'Registra e consulta trabalhos das turmas e matérias em que leciona',
            'permissions' => ['escola.view', 'portfolio.view', 'portfolio.professor'],
        ],
        'portfolio_gestor' => [
            'name' => 'Gestão do Portfólio',
            'description' => 'Acesso total aos portfólios da escola e aos relatórios',
            'permissions' => ['escola.view', 'portfolio.view', 'portfolio.manage'],
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
                ['name' => $name, 'module' => 'portfolio', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'portfolio',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $ids = array_map(fn (string $p): int => $permissionIds[$p] ?? $this->permissaoExterna($p), $perfil['permissions']);
            $role->permissions()->sync($ids);

            Role::query()->where('slug', $slug)->where('tenant_id', '!=', $sysTenant->id)
                ->each(fn (Role $clone) => $clone->permissions()->syncWithoutDetaching($ids));
        }

        $this->informar('Portfólio: permissões e perfis-template (Professor, Gestão) semeados.');
    }

    private function permissaoExterna(string $slug): int
    {
        return Permission::firstOrCreate(
            ['slug' => $slug],
            ['name' => $slug, 'module' => explode('.', $slug)[0], 'guard_name' => 'web']
        )->id;
    }

    private function informar(string $mensagem): void
    {
        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info($mensagem);
        }
    }
}

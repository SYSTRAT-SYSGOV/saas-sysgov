<?php

declare(strict_types=1);

namespace Modules\Parecer\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do Parecer Descritivo, equivalentes aos perfis do sistema PHP:
 * Administrador e Diretor(a) (gestor + auditoria), Pedagogo(a) (gestor) e Professor(a).
 * Perfis-modelo no tenant SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado.
 * Ser Professor(a) não basta: as regras também exigem a função na turma (parecer_turma_funcoes).
 */
final class ParecerRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'parecer.view' => 'Acessar o módulo Parecer Descritivo',
        'parecer.professor' => 'Avaliar, lançar notas, frequência e ocorrências nas turmas e matérias da sua função (Parecer Descritivo)',
        'parecer.gestor' => 'Acessar todas as turmas e matérias, definir séries e funções das turmas e editar os conteúdos (Parecer Descritivo)',
        'parecer.auditoria' => 'Consultar a auditoria do módulo (Parecer Descritivo)',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'parecer_direcao' => [
            'name' => 'Direção (Parecer)',
            'description' => 'Acesso total ao Parecer Descritivo, inclusive a auditoria',
            'permissions' => ['escola.view', 'parecer.view', 'parecer.gestor', 'parecer.auditoria'],
        ],
        'parecer_pedagogia' => [
            'name' => 'Pedagogia (Parecer)',
            'description' => 'Todas as turmas e matérias, séries e funções das turmas e conteúdos; sem auditoria',
            'permissions' => ['escola.view', 'parecer.view', 'parecer.gestor'],
        ],
        'parecer_professor' => [
            'name' => 'Professor(a) (Parecer)',
            'description' => 'Avalia e lança notas, frequência e ocorrências só nas turmas e matérias da sua função',
            'permissions' => ['escola.view', 'parecer.view', 'parecer.professor'],
        ],
    ];

    public function run(): void
    {
        $sysTenant = Tenant::updateOrCreate(
            ['slug' => 'systrat'],
            ['name' => 'SYSTRAT (Sistema)', 'cnpj' => '00000000000000', 'type' => 'interno', 'status' => 'active']
        );

        $ids = [];
        foreach (self::PERMISSOES as $slug => $name) {
            $ids[$slug] = Permission::updateOrCreate(['slug' => $slug], ['name' => $name, 'module' => 'parecer', 'guard_name' => 'web'])->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                ['name' => $perfil['name'], 'scope' => 'tenant', 'module' => 'parecer', 'is_system' => true, 'description' => $perfil['description'], 'guard_name' => 'web']
            );
            $permissoes = array_map(fn (string $p): int => $ids[$p] ?? Permission::firstOrCreate(['slug' => $p], ['name' => $p, 'module' => explode('.', $p)[0], 'guard_name' => 'web'])->id, $perfil['permissions']);
            $role->permissions()->sync($permissoes);
            Role::query()->where('slug', $slug)->where('tenant_id', '!=', $sysTenant->id)
                ->each(fn (Role $clone) => $clone->permissions()->syncWithoutDetaching($permissoes));
        }

        // @phpstan-ignore isset.property (o Seeder declara $command como não nulo, mas é null fora do artisan)
        if (isset($this->command)) {
            $this->command->info('Parecer: permissões e perfis-modelo (Direção, Pedagogia, Professor) semeados.');
        }
    }
}

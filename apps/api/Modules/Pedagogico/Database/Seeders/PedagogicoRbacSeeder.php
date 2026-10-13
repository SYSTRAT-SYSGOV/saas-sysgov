<?php

declare(strict_types=1);

namespace Modules\Pedagogico\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Pedagógico — Direção, Pedagogia e Professor.
 *
 * Mesmo padrão do CursosRbacSeeder: perfis-modelo (scope=tenant, module='pedagogico') no tenant interno da
 * SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado. Ser Professor não basta para
 * lançar notas: as policies também exigem o vínculo turma × matéria no cadastro escolar (design D6).
 */
final class PedagogicoRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'pedagogico.view' => 'Acessar o módulo Pedagógico',
        'pedagogico.notas.manage' => 'Lançar e importar notas de qualquer turma (Pedagógico)',
        'pedagogico.ocorrencias.manage' => 'Registrar, editar e excluir ocorrências (Pedagógico)',
        'pedagogico.conselho.manage' => 'Gerenciar pré-conselho, cronograma e atas do conselho de classe (Pedagógico)',
        'pedagogico.frequencia.manage' => 'Registrar a frequência diária de qualquer turma (Pedagógico)',
        'pedagogico.professor' => 'Lançar notas, fichas de pré-conselho e frequência nas turmas e matérias em que é o professor vinculado (Pedagógico)',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'pedagogico_direcao' => [
            'name' => 'Direção (Pedagógico)',
            'description' => 'Acesso total ao módulo Pedagógico: notas, ocorrências, conselho de classe e frequência',
            'permissions' => ['escola.view', 'pedagogico.view', 'pedagogico.notas.manage', 'pedagogico.ocorrencias.manage', 'pedagogico.conselho.manage', 'pedagogico.frequencia.manage'],
        ],
        'pedagogico_pedagogia' => [
            'name' => 'Pedagogia',
            'description' => 'Ocorrências, pré-conselho, cronograma, atas e frequência; não lança notas',
            'permissions' => ['escola.view', 'pedagogico.view', 'pedagogico.ocorrencias.manage', 'pedagogico.conselho.manage', 'pedagogico.frequencia.manage'],
        ],
        'pedagogico_professor' => [
            'name' => 'Professor',
            'description' => 'Lança notas, fichas de pré-conselho e frequência só nas turmas e matérias em que está vinculado',
            'permissions' => ['escola.view', 'pedagogico.view', 'pedagogico.professor'],
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
                ['name' => $name, 'module' => 'pedagogico', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'pedagogico',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $ids = array_map(fn (string $p): int => $permissionIds[$p] ?? $this->permissaoExterna($p), $perfil['permissions']);
            $role->permissions()->sync($ids);

            // Perfis já clonados em tenants recebem as permissões novas (só acrescenta: não desfaz personalizações).
            Role::query()->where('slug', $slug)->where('tenant_id', '!=', $sysTenant->id)
                ->each(fn (Role $clone) => $clone->permissions()->syncWithoutDetaching($ids));
        }

        $this->informar('Pedagógico: permissões e perfis-template (Direção, Pedagogia, Professor) semeados.');
    }

    /** Permissão de outro módulo (ex.: escola.view): usa a existente ou cria o registro, que o seeder dono completa. */
    private function permissaoExterna(string $slug): int
    {
        return Permission::firstOrCreate(
            ['slug' => $slug],
            ['name' => $slug, 'module' => explode('.', $slug)[0], 'guard_name' => 'web']
        )->id;
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

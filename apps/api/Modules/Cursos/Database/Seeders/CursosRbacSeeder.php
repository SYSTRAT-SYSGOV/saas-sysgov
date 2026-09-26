<?php

declare(strict_types=1);

namespace Modules\Cursos\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Cursos — Administrador, Instrutor e Participante.
 *
 * Mesmo padrão do CapdRbacSeeder: roles "template" com scope=tenant e
 * module='cursos' no tenant interno da SYSTRAT, clonadas para o tenant
 * pelo ModuleRoleProvisioner quando o módulo é habilitado. Roda no
 * docker-entrypoint.sh a cada boot (idempotente).
 *
 * Ser instrutor não basta para operar uma turma: as policies também exigem
 * o vínculo em cursos_turma_instrutores (design D11).
 */
final class CursosRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'cursos.view' => 'Acessar o módulo de Cursos e o catálogo publicado',
        'cursos.manage' => 'Administrar cursos, formações, turmas, inscrições e certificados (Cursos)',
        'cursos.instrutor' => 'Operar as turmas em que é instrutor designado — chamada, QR de check-in e encerramento (Cursos)',
        'cursos.participar' => 'Inscrever-se em turmas e acessar os próprios cursos e certificados (Cursos)',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'admin_cursos' => [
            'name' => 'Administrador de Cursos',
            'description' => 'Acesso total ao módulo de Cursos e Formações do órgão',
            'permissions' => ['cursos.view', 'cursos.manage', 'cursos.instrutor', 'cursos.participar'],
        ],
        'instrutor_cursos' => [
            'name' => 'Instrutor',
            'description' => 'Opera as turmas em que é instrutor designado: aulas, chamada, QR de check-in e encerramento',
            'permissions' => ['cursos.view', 'cursos.instrutor', 'cursos.participar'],
        ],
        'participante_cursos' => [
            'name' => 'Participante de Cursos',
            'description' => 'Inscreve-se em turmas e acessa os próprios cursos, frequência e certificados',
            'permissions' => ['cursos.view', 'cursos.participar'],
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
                ['name' => $name, 'module' => 'cursos', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'cursos',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync(array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions']));
        }

        $this->informar('Cursos: permissões e perfis-template (Administrador, Instrutor, Participante) semeados.');
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

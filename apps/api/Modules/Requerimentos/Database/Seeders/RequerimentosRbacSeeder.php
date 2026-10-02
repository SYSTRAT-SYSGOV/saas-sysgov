<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Requerimentos — Administrador, Autor e Tramitador.
 *
 * Mesmo padrão do CursosRbacSeeder: roles "template" com scope=tenant e
 * module='requerimentos' no tenant interno da SYSTRAT, clonadas para o
 * tenant pelo ModuleRoleProvisioner quando o módulo é habilitado.
 *
 * Achado da revisão de autorização (tarefa de correção da base de
 * tenant/autorização): o módulo não tinha NENHUM seeder de RBAC — as
 * permissões declaradas em module.json (view/create/.../admin) nunca
 * chegavam a existir como `Permission`, e não havia nenhuma `Role` que as
 * concedesse além do bypass de `is_platform_admin`.
 */
final class RequerimentosRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'requerimentos.view' => 'Acessar o módulo de Requerimentos e consultar proposições',
        'requerimentos.create' => 'Protocolar novas proposições (Requerimentos)',
        'requerimentos.edit' => 'Editar proposições próprias (Requerimentos)',
        'requerimentos.delete' => 'Excluir proposições (Requerimentos)',
        'requerimentos.tramitar' => 'Encaminhar e receber tramitações entre Poderes (Requerimentos)',
        'requerimentos.responder' => 'Elaborar e enviar respostas formais às tramitações (Requerimentos)',
        'requerimentos.relatorios' => 'Consultar relatórios gerenciais e estatísticos (Requerimentos)',
        'requerimentos.auditoria' => 'Consultar a trilha de auditoria do módulo (Requerimentos)',
        'requerimentos.admin' => 'Administrar parametrização do módulo — tipos de instrumento (Requerimentos)',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'admin_requerimentos' => [
            'name' => 'Administrador de Requerimentos',
            'description' => 'Acesso total ao módulo de Requerimentos do órgão',
            'permissions' => [
                'requerimentos.view', 'requerimentos.create', 'requerimentos.edit', 'requerimentos.delete',
                'requerimentos.tramitar', 'requerimentos.responder', 'requerimentos.relatorios',
                'requerimentos.auditoria', 'requerimentos.admin',
            ],
        ],
        'autor_requerimentos' => [
            'name' => 'Autor de Proposições',
            'description' => 'Protocola, edita e acompanha as próprias proposições legislativas',
            // 'requerimentos.edit' faltava aqui apesar de a própria descrição da permissão dizer
            // "editar proposições PRÓPRIAS" — a ProposicaoPolicy::update já restringe a edição ao
            // autor (ou admin), então sem essa permissão o autor nunca conseguia editar nada,
            // mesmo sendo dono da proposição. Lacuna anterior à funcionalidade de edição existir.
            'permissions' => ['requerimentos.view', 'requerimentos.create', 'requerimentos.edit'],
        ],
        'tramitador_requerimentos' => [
            'name' => 'Tramitador',
            'description' => 'Encaminha, recebe e responde tramitações entre Câmara e Prefeitura',
            'permissions' => ['requerimentos.view', 'requerimentos.tramitar', 'requerimentos.responder'],
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
                ['name' => $name, 'module' => 'requerimentos', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'requerimentos',
                    'is_system' => true,
                    'description' => $perfil['description'],
                    'guard_name' => 'web',
                ]
            );

            $role->permissions()->sync(array_map(fn (string $p): int => $permissionIds[$p], $perfil['permissions']));
        }

        $this->informar('Requerimentos: permissões e perfis-template (Administrador, Autor, Tramitador) semeados.');
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

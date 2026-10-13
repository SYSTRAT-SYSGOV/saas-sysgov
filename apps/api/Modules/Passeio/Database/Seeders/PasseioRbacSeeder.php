<?php

declare(strict_types=1);

namespace Modules\Passeio\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Passeio — Coordenação de Passeios e Apoio.
 *
 * Mesmo padrão do CursosRbacSeeder: perfis-modelo (scope=tenant, module='passeio') no tenant interno da
 * SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado.
 */
final class PasseioRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'passeio.view' => 'Acessar o módulo de Passeios',
        'passeio.passeios.manage' => 'Gerenciar passeios, inscrições e autorizações',
        'passeio.frota.manage' => 'Gerenciar veículos e o mapa de assentos dos passeios',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'passeio_coordenacao' => [
            'name' => 'Coordenação de Passeios',
            'description' => 'Acesso total: passeios, inscrições, autorizações, veículos e assentos',
            'permissions' => ['escola.view', 'passeio.view', 'passeio.passeios.manage', 'passeio.frota.manage'],
        ],
        'passeio_apoio' => [
            'name' => 'Apoio (Passeios)',
            'description' => 'Consulta passeios, inscrições, frota e assentos',
            'permissions' => ['escola.view', 'passeio.view'],
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
                ['name' => $name, 'module' => 'passeio', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'passeio',
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

        $this->informar('Passeio: permissões e perfis-template (Coordenação, Apoio) semeados.');
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

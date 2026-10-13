<?php

declare(strict_types=1);

namespace Modules\Formatura\Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Database\Seeder;

/**
 * Perfis do módulo Formatura — Comissão de Formatura e Tesouraria.
 *
 * Mesmo padrão do CursosRbacSeeder: perfis-modelo (scope=tenant, module='formatura') no tenant interno da
 * SYSTRAT, clonados pelo ModuleRoleProvisioner quando o módulo é habilitado.
 */
final class FormaturaRbacSeeder extends Seeder
{
    /** @var array<string, string> */
    public const PERMISSOES = [
        'formatura.view' => 'Acessar o módulo de Formatura',
        'formatura.config.manage' => 'Configurar valores, parcelas e formas de pagamento da formatura',
        'formatura.formandos.manage' => 'Gerenciar a participação e os convidados dos formandos',
        'formatura.pagamentos.manage' => 'Registrar e estornar pagamentos da formatura',
    ];

    /** @var array<string, array{name: string, description: string, permissions: list<string>}> */
    public const PERFIS = [
        'formatura_comissao' => [
            'name' => 'Comissão de Formatura',
            'description' => 'Acesso total: configuração, formandos, pagamentos e relatórios',
            'permissions' => ['escola.view', 'formatura.view', 'formatura.config.manage', 'formatura.formandos.manage', 'formatura.pagamentos.manage'],
        ],
        'formatura_tesouraria' => [
            'name' => 'Tesouraria (Formatura)',
            'description' => 'Consulta formandos e relatórios e registra pagamentos',
            'permissions' => ['escola.view', 'formatura.view', 'formatura.pagamentos.manage'],
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
                ['name' => $name, 'module' => 'formatura', 'guard_name' => 'web']
            )->id;
        }

        foreach (self::PERFIS as $slug => $perfil) {
            $role = Role::updateOrCreate(
                ['slug' => $slug, 'tenant_id' => $sysTenant->id],
                [
                    'name' => $perfil['name'],
                    'scope' => 'tenant',
                    'module' => 'formatura',
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

        $this->informar('Formatura: permissões e perfis-template (Comissão, Tesouraria) semeados.');
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

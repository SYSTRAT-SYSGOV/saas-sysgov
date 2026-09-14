<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Role;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

/**
 * Provisiona automaticamente as roles/permissions específicas de um
 * módulo para um tenant, no momento em que o módulo é habilitado.
 *
 * Cada módulo pode declarar suas próprias roles-template (roles com
 * scope='tenant' e module=<alias do módulo>, associadas ao tenant
 * interno da SYSTRAT — ver Modules\Capd\Database\Seeders\CapdRbacSeeder
 * como exemplo). Um tenant que nunca habilitou o módulo nunca vê essas
 * roles na tela de Roles & Permissões; ao habilitar, elas são clonadas
 * automaticamente (idempotente — nunca duplica).
 */
final readonly class ModuleRoleProvisioner
{
    /**
     * Clona para $tenant as roles-template do módulo $moduleAlias que
     * ainda não existem para ele.
     *
     * @return int Quantidade de roles clonadas nesta chamada.
     */
    public function provisionForTenant(Tenant $tenant, string $moduleAlias): int
    {
        $sysTenant = Tenant::where('slug', 'systrat')->first();

        if ($sysTenant === null) {
            return 0;
        }

        $templates = Role::query()
            ->where('scope', 'tenant')
            ->where('module', $moduleAlias)
            ->where('tenant_id', $sysTenant->id)
            ->get();

        $clonadas = 0;

        foreach ($templates as $template) {
            $jaExiste = Role::query()
                ->where('slug', $template->slug)
                ->where('tenant_id', $tenant->id)
                ->exists();

            if ($jaExiste) {
                continue;
            }

            DB::transaction(function () use ($template, $tenant): void {
                $clone = Role::create([
                    'name'        => $template->name,
                    'slug'        => $template->slug,
                    'description' => $template->description,
                    'scope'       => 'tenant',
                    'module'      => $template->module,
                    'tenant_id'   => $tenant->id,
                    'is_system'   => $template->is_system,
                    'guard_name'  => 'web',
                ]);

                $clone->permissions()->sync($template->permissions()->pluck('permissions.id'));
            });

            $clonadas++;
        }

        return $clonadas;
    }
}

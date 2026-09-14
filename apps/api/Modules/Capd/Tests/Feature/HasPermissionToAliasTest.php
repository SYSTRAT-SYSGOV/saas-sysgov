<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Bug real encontrado no sub-projeto E: vários pontos do módulo Capd chamam
 * User::hasPermissionTo() (NivelHierarquiaController, PendenciaHierarquiaController,
 * HomologacaoController, DiarioBordoPolicy, AvaliacaoPolicy), mas essa classe só
 * define hasPermission() (sem "To") — hasPermissionTo() não existe e o Eloquent
 * Model::__call encaminha a chamada pro Query Builder, que também não a tem,
 * lançando BadMethodCallException em vez de retornar false/true.
 */
final class HasPermissionToAliasTest extends TestCase
{
    use RefreshDatabase;

    public function test_has_permission_to_e_um_alias_funcional_de_has_permission(): void
    {
        $tenant = Tenant::create(['name' => 'Município de Araucária HasPermissionTo', 'slug' => 'pref-haspermissionto', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $user = User::create(['name' => 'Usuario Sem Permissao', 'email' => 'sem.permissao@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $user->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->assertFalse($user->hasPermissionTo('capd.admin.parametrizar'));

        app(TenantContext::class)->clear();
    }
}

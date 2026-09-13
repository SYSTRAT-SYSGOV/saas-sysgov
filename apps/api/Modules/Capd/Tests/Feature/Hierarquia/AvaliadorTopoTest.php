<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\HierarquiaService;
use Modules\OrgChart\Models\OrgUnit;
use Tests\TestCase;

final class AvaliadorTopoTest extends TestCase
{
    use RefreshDatabase;

    private function montarServidorSemResponsavel(Tenant $tenant): Servidor
    {
        $raiz = OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Raiz', 'code' => 'RZ-TOPO', 'type' => 'raiz', 'level' => 1, 'path' => '0']);
        $raiz->update(['path' => (string) $raiz->id]);

        $servidorUser = User::factory()->create();

        return Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-009', 'cpf' => '999.999.999-99',
            'nome_completo' => 'Gestor Máximo', 'cargo_efetivo' => 'Secretário', 'orgao_lotacao' => 'Raiz',
            'user_id' => $servidorUser->id, 'org_unit_id' => $raiz->id,
        ]);
    }

    public function test_resolve_avaliador_topo_configurado_por_user_fixo(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier8a', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $avaliadorTopo = User::factory()->create();

        NivelHierarquia::create([
            'tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Topo', 'regra_substituicao' => 'superior_hierarquico',
            'is_topo' => true, 'avaliador_topo_user_id' => $avaliadorTopo->id,
        ]);

        $servidor = $this->montarServidorSemResponsavel($tenant);

        $resultado = app(HierarquiaService::class)->resolverAvaliador($servidor, Carbon::now());

        self::assertFalse($resultado->pendente);
        self::assertTrue($resultado->viaTopo);
        self::assertSame($avaliadorTopo->id, $resultado->userId);
    }

    public function test_resolve_avaliador_topo_configurado_por_role(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier8b', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $role = Role::create([
            'name' => 'Controladoria', 'slug' => 'controladoria', 'scope' => 'tenant',
            'guard_name' => 'web', 'tenant_id' => $tenant->id, 'is_system' => false,
        ]);

        $avaliadorTopo = User::factory()->create();
        DB::table('tenant_user')->insert([
            'tenant_id' => $tenant->id, 'user_id' => $avaliadorTopo->id, 'role_id' => $role->id,
        ]);

        NivelHierarquia::create([
            'tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Topo', 'regra_substituicao' => 'superior_hierarquico',
            'is_topo' => true, 'avaliador_topo_role' => 'controladoria',
        ]);

        $servidor = $this->montarServidorSemResponsavel($tenant);

        $resultado = app(HierarquiaService::class)->resolverAvaliador($servidor, Carbon::now());

        self::assertFalse($resultado->pendente);
        self::assertTrue($resultado->viaTopo);
        self::assertSame($avaliadorTopo->id, $resultado->userId);
    }
}

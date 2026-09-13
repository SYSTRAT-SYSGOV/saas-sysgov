<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\HierarquiaService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Tests\TestCase;

final class ResolverAvaliadorHibridoTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_usa_nivel_configurado_e_responsavel_real_da_unidade(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier2', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $secretaria = OrgUnit::create([
            'tenant_id' => $tenant->id, 'name' => 'Secretaria', 'code' => 'SEC-02', 'type' => 'secretaria', 'level' => 1, 'path' => '0',
        ]);
        $secretaria->update(['path' => (string) $secretaria->id]);

        $departamento = OrgUnit::create([
            'tenant_id' => $tenant->id, 'parent_id' => $secretaria->id, 'name' => 'Departamento', 'code' => 'DEP-02', 'type' => 'departamento', 'level' => 2, 'path' => '0',
        ]);
        $departamento->update(['path' => $secretaria->id . '.' . $departamento->id]);

        NivelHierarquia::create([
            'tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Departamento',
            'regra_substituicao' => NivelHierarquia::REGRA_SUPERIOR_HIERARQUICO, 'is_topo' => false,
        ]);
        NivelHierarquia::create([
            'tenant_id' => $tenant->id, 'nivel' => 1, 'nome' => 'Secretaria',
            'regra_substituicao' => NivelHierarquia::REGRA_SUPERIOR_HIERARQUICO, 'is_topo' => false,
        ]);

        // Departamento SEM responsável cadastrado; secretaria COM responsável.
        $responsavelSecretaria = User::factory()->create();
        OrgUnitUser::create([
            'tenant_id' => $tenant->id, 'org_unit_id' => $secretaria->id, 'user_id' => $responsavelSecretaria->id,
            'role' => 'responsavel', 'valid_from' => Carbon::parse('2020-01-01'), 'valid_to' => null,
        ]);

        $servidorUser = User::factory()->create();
        $servidor = Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-002', 'cpf' => '222.222.222-22',
            'nome_completo' => 'Ciclana', 'cargo_efetivo' => 'Técnica', 'orgao_lotacao' => 'Departamento',
            'user_id' => $servidorUser->id, 'org_unit_id' => $departamento->id,
        ]);

        $resultado = app(HierarquiaService::class)->resolverAvaliador($servidor, Carbon::now());

        self::assertFalse($resultado->pendente);
        self::assertSame($responsavelSecretaria->id, $resultado->userId);
        self::assertSame(1, $resultado->nivelUsado);
    }
}

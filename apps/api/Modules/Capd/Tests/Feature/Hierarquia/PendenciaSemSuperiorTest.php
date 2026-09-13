<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\PendenciaHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\HierarquiaService;
use Modules\OrgChart\Models\OrgUnit;
use Tests\TestCase;

final class PendenciaSemSuperiorTest extends TestCase
{
    use RefreshDatabase;

    public function test_cria_pendencia_quando_arvore_esgota_sem_resolver(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier7', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $raiz = OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Raiz', 'code' => 'RZ-01', 'type' => 'raiz', 'level' => 1, 'path' => '0']);
        $raiz->update(['path' => (string) $raiz->id]);

        // Nível configurado, mas sem is_topo e sem nenhum responsável cadastrado em lugar nenhum.
        NivelHierarquia::create(['tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Raiz', 'regra_substituicao' => 'superior_hierarquico', 'is_topo' => false]);

        $servidorUser = User::factory()->create();
        $servidor = Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-008', 'cpf' => '888.888.888-88',
            'nome_completo' => 'Sem Superior', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'Raiz',
            'user_id' => $servidorUser->id, 'org_unit_id' => $raiz->id,
        ]);

        $resultado = app(HierarquiaService::class)->resolverAvaliador($servidor, Carbon::now());

        self::assertTrue($resultado->pendente);
        self::assertNull($resultado->userId);

        $pendencia = PendenciaHierarquia::query()->where('servidor_id', $servidor->id)->first();
        self::assertNotNull($pendencia);
        self::assertSame(PendenciaHierarquia::TIPO_SEM_SUPERIOR, $pendencia->tipo_pendencia);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\PendenciaHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorUnitHistory;
use Modules\OrgChart\Models\OrgUnit;
use Tests\TestCase;

final class TenantIsolationHierarquiaTest extends TestCase
{
    use RefreshDatabase;

    public function test_niveis_pendencias_e_unit_history_sao_isolados_por_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a-hier', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b-hier', 'type' => 'prefeitura', 'status' => 'active']);

        $context = app(TenantContext::class);

        $context->set($tenantA);
        $unidadeA = OrgUnit::create(['tenant_id' => $tenantA->id, 'name' => 'Unidade A', 'code' => 'UN-ISO-A', 'type' => 'departamento', 'level' => 1, 'path' => '0']);
        $unidadeA->update(['path' => (string) $unidadeA->id]);
        $servidorA = Servidor::create([
            'tenant_id' => $tenantA->id, 'matricula' => 'SERV-ISO-A', 'cpf' => '121.212.121-21',
            'nome_completo' => 'Servidor A', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'Unidade A',
            'user_id' => User::factory()->create()->id, 'org_unit_id' => $unidadeA->id,
        ]);
        NivelHierarquia::create(['tenant_id' => $tenantA->id, 'nivel' => 0, 'nome' => 'Nível A', 'regra_substituicao' => 'superior_hierarquico']);
        PendenciaHierarquia::create(['tenant_id' => $tenantA->id, 'servidor_id' => $servidorA->id, 'tipo_pendencia' => 'sem_superior', 'motivo' => 'teste A', 'status' => 'aberta']);
        // ServidorUnitHistory da unidade A já foi criado automaticamente pelo observer de Servidor::created().

        $context->set($tenantB);
        $unidadeB = OrgUnit::create(['tenant_id' => $tenantB->id, 'name' => 'Unidade B', 'code' => 'UN-ISO-B', 'type' => 'departamento', 'level' => 1, 'path' => '0']);
        $unidadeB->update(['path' => (string) $unidadeB->id]);
        $servidorB = Servidor::create([
            'tenant_id' => $tenantB->id, 'matricula' => 'SERV-ISO-B', 'cpf' => '232.323.232-32',
            'nome_completo' => 'Servidor B', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'Unidade B',
            'user_id' => User::factory()->create()->id, 'org_unit_id' => $unidadeB->id,
        ]);
        NivelHierarquia::create(['tenant_id' => $tenantB->id, 'nivel' => 0, 'nome' => 'Nível B', 'regra_substituicao' => 'superior_hierarquico']);
        PendenciaHierarquia::create(['tenant_id' => $tenantB->id, 'servidor_id' => $servidorB->id, 'tipo_pendencia' => 'sem_superior', 'motivo' => 'teste B', 'status' => 'aberta']);
        // ServidorUnitHistory da unidade B já foi criado automaticamente pelo observer de Servidor::created().

        $context->set($tenantA);
        self::assertSame(1, NivelHierarquia::query()->count());
        self::assertSame('Nível A', NivelHierarquia::query()->first()->nome);
        self::assertSame(1, PendenciaHierarquia::query()->count());
        self::assertSame($servidorA->id, PendenciaHierarquia::query()->first()->servidor_id);
        self::assertSame(1, ServidorUnitHistory::query()->count());
        self::assertSame($servidorA->id, ServidorUnitHistory::query()->first()->servidor_id);

        $context->set($tenantB);
        self::assertSame(1, NivelHierarquia::query()->count());
        self::assertSame('Nível B', NivelHierarquia::query()->first()->nome);
        self::assertSame(1, PendenciaHierarquia::query()->count());
        self::assertSame($servidorB->id, PendenciaHierarquia::query()->first()->servidor_id);
        self::assertSame(1, ServidorUnitHistory::query()->count());
        self::assertSame($servidorB->id, ServidorUnitHistory::query()->first()->servidor_id);
    }
}

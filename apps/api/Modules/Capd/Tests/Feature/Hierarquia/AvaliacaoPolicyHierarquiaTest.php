<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Tests\TestCase;

final class AvaliacaoPolicyHierarquiaTest extends TestCase
{
    use RefreshDatabase;

    public function test_nega_avaliar_quando_usuario_nao_e_o_resolvido_mesmo_com_avaliador_id_proprio(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier9', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $unidade = OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Unidade', 'code' => 'UN-09', 'type' => 'departamento', 'level' => 1, 'path' => '0']);
        $unidade->update(['path' => (string) $unidade->id]);

        NivelHierarquia::create(['tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Unidade', 'regra_substituicao' => 'superior_hierarquico']);

        $userA = User::factory()->create(); // será gravado como avaliador_id (bypass tentado)
        $userB = User::factory()->create(); // é o responsável REAL da unidade

        OrgUnitUser::create(['tenant_id' => $tenant->id, 'org_unit_id' => $unidade->id, 'user_id' => $userB->id, 'role' => 'responsavel', 'valid_from' => Carbon::parse('2020-01-01')]);

        $servidorUser = User::factory()->create();
        Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-010', 'cpf' => '101.010.101-01',
            'nome_completo' => 'Avaliado', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'Unidade',
            'user_id' => $servidorUser->id, 'org_unit_id' => $unidade->id,
        ]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'ano_referencia' => 2026, 'nome' => 'Ciclo 2026',
            'data_inicio_avaliacao' => '2026-01-01', 'data_fim_avaliacao' => '2026-06-30',
            'data_limite_recurso' => '2026-07-31', 'status' => CicloAvaliacao::STATUS_EM_AVALIACAO,
        ]);

        // Registro gravado com avaliador_id = userA (tentativa de bypass: A não é o superior real).
        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $userA->id, 'respostas_fatores' => [], 'homologada' => false,
        ]);

        self::assertFalse(
            Gate::forUser($userA)->allows('avaliar', $avaliacao),
            'A policy não deve confiar no avaliador_id gravado: A não é o superior real resolvido pela árvore.'
        );

        self::assertTrue(
            Gate::forUser($userB)->allows('avaliar', $avaliacao),
            'B é o superior real resolvido pela árvore e deve ser autorizado, mesmo com avaliador_id gravado apontando para A.'
        );
    }
}

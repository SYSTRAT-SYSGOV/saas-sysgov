<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Capd\Models\Comissao;
use Modules\Capd\Models\ComissaoMembro;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Impedimento;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\HierarquiaService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Tests\TestCase;

final class ImpedimentoBloqueiaSubidaTest extends TestCase
{
    use RefreshDatabase;

    public function test_impedimento_pula_para_proximo_nivel(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier3', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $secretaria = OrgUnit::create([
            'tenant_id' => $tenant->id, 'name' => 'Secretaria', 'code' => 'SEC-03', 'type' => 'secretaria', 'level' => 1, 'path' => '0',
        ]);
        $secretaria->update(['path' => (string) $secretaria->id]);

        $departamento = OrgUnit::create([
            'tenant_id' => $tenant->id, 'parent_id' => $secretaria->id, 'name' => 'Departamento', 'code' => 'DEP-03', 'type' => 'departamento', 'level' => 2, 'path' => '0',
        ]);
        $departamento->update(['path' => $secretaria->id . '.' . $departamento->id]);

        NivelHierarquia::create(['tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Departamento', 'regra_substituicao' => 'superior_hierarquico']);
        NivelHierarquia::create(['tenant_id' => $tenant->id, 'nivel' => 1, 'nome' => 'Secretaria', 'regra_substituicao' => 'superior_hierarquico']);

        $r1 = User::factory()->create();
        $r2 = User::factory()->create();

        OrgUnitUser::create(['tenant_id' => $tenant->id, 'org_unit_id' => $departamento->id, 'user_id' => $r1->id, 'role' => 'responsavel', 'valid_from' => Carbon::parse('2020-01-01')]);
        OrgUnitUser::create(['tenant_id' => $tenant->id, 'org_unit_id' => $secretaria->id, 'user_id' => $r2->id, 'role' => 'responsavel', 'valid_from' => Carbon::parse('2020-01-01')]);

        $servidorUser = User::factory()->create();
        $servidor = Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-003', 'cpf' => '333.333.333-33',
            'nome_completo' => 'Beltrano', 'cargo_efetivo' => 'Assistente', 'orgao_lotacao' => 'Departamento',
            'user_id' => $servidorUser->id, 'org_unit_id' => $departamento->id,
        ]);

        // Registra impedimento formal de R1 em relação ao servidor via comissão CAPD.
        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'ano_referencia' => 2026, 'nome' => 'Ciclo 2026',
            'data_inicio_avaliacao' => '2026-01-01', 'data_fim_avaliacao' => '2026-06-30',
            'data_limite_recurso' => '2026-07-31', 'status' => CicloAvaliacao::STATUS_EM_AVALIACAO,
        ]);
        $comissao = Comissao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'numero_portaria' => 'Portaria 1/2026',
            'data_publicacao_portaria' => '2026-01-02', 'ativa' => true,
        ]);
        $membroR1 = ComissaoMembro::create([
            'tenant_id' => $tenant->id, 'comissao_id' => $comissao->id, 'servidor_id' => $r1->id,
            'papel' => ComissaoMembro::PAPEL_TITULAR_GESTAO, 'ativo' => true,
        ]);
        Impedimento::create([
            'tenant_id' => $tenant->id, 'comissao_membro_id' => $membroR1->id, 'servidor_alvo_id' => $servidorUser->id,
            'tipo_impedimento' => 'conflito_interesse', 'motivo' => 'Conflito declarado.', 'declarado_por' => $r2->id,
        ]);

        $resultado = app(HierarquiaService::class)->resolverAvaliador($servidor, Carbon::now());

        self::assertFalse($resultado->pendente);
        self::assertSame($r2->id, $resultado->userId);
        self::assertSame(1, $resultado->nivelUsado);
    }
}

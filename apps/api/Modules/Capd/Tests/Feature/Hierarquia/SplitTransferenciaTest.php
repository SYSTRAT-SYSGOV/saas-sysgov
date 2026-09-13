<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature\Hierarquia;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\NivelHierarquia;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Models\ServidorUnitHistory;
use Modules\Capd\Services\HierarquiaService;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;
use Tests\TestCase;

final class SplitTransferenciaTest extends TestCase
{
    use RefreshDatabase;

    public function test_divide_avaliacao_em_parciais_e_consolida_media_ponderada(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste-hier6', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $unidadeA = OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Unidade A', 'code' => 'UN-A', 'type' => 'departamento', 'level' => 1, 'path' => '0']);
        $unidadeA->update(['path' => (string) $unidadeA->id]);
        $unidadeB = OrgUnit::create(['tenant_id' => $tenant->id, 'name' => 'Unidade B', 'code' => 'UN-B', 'type' => 'departamento', 'level' => 1, 'path' => '0']);
        $unidadeB->update(['path' => (string) $unidadeB->id]);

        NivelHierarquia::create(['tenant_id' => $tenant->id, 'nivel' => 0, 'nome' => 'Departamento', 'regra_substituicao' => 'superior_hierarquico']);

        $responsavelA = User::factory()->create();
        $responsavelB = User::factory()->create();
        OrgUnitUser::create(['tenant_id' => $tenant->id, 'org_unit_id' => $unidadeA->id, 'user_id' => $responsavelA->id, 'role' => 'responsavel', 'valid_from' => Carbon::parse('2020-01-01')]);
        OrgUnitUser::create(['tenant_id' => $tenant->id, 'org_unit_id' => $unidadeB->id, 'user_id' => $responsavelB->id, 'role' => 'responsavel', 'valid_from' => Carbon::parse('2020-01-01')]);

        $servidorUser = User::factory()->create();
        $servidor = Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SERV-007', 'cpf' => '777.777.777-77',
            'nome_completo' => 'Transferido', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'Unidade B',
            'user_id' => $servidorUser->id,
        ]);

        ServidorUnitHistory::create([
            'tenant_id' => $tenant->id, 'servidor_id' => $servidor->id, 'org_unit_id' => $unidadeA->id,
            'valido_de' => '2026-01-01', 'valido_ate' => '2026-06-30',
        ]);
        ServidorUnitHistory::create([
            'tenant_id' => $tenant->id, 'servidor_id' => $servidor->id, 'org_unit_id' => $unidadeB->id,
            'valido_de' => '2026-07-01', 'valido_ate' => null,
        ]);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'ano_referencia' => 2026, 'nome' => 'Ciclo 2026',
            'data_inicio_avaliacao' => '2026-01-01', 'data_fim_avaliacao' => '2026-12-31',
            'data_limite_recurso' => '2027-01-31', 'status' => CicloAvaliacao::STATUS_EM_AVALIACAO,
        ]);

        app(HierarquiaService::class)->dividirPorTransferencia($servidor, $ciclo);

        $parciais = Avaliacao::query()
            ->where('servidor_id', $servidorUser->id)
            ->where('tipo_avaliacao', Avaliacao::TIPO_PARCIAL)
            ->orderBy('periodo_inicio')
            ->get();

        self::assertCount(2, $parciais);
        self::assertSame(181, $parciais[0]->dias_exercicio);
        self::assertSame(184, $parciais[1]->dias_exercicio);
        self::assertSame($responsavelA->id, $parciais[0]->avaliador_id);
        self::assertSame($responsavelB->id, $parciais[1]->avaliador_id);

        $consolidada = Avaliacao::query()
            ->where('servidor_id', $servidorUser->id)
            ->where('tipo_avaliacao', Avaliacao::TIPO_CONSOLIDADA)
            ->firstOrFail();

        self::assertFalse($consolidada->homologada);

        $parciais[0]->update(['nota_final' => '7.00', 'homologada' => true, 'homologada_em' => now()]);
        self::assertFalse($consolidada->fresh()->homologada, 'Não deve consolidar antes de todas as parciais homologadas.');

        $parciais[1]->update(['nota_final' => '9.00', 'homologada' => true, 'homologada_em' => now()]);

        $consolidada->refresh();
        self::assertTrue($consolidada->homologada);
        self::assertSame('8.01', $consolidada->nota_final);
    }
}

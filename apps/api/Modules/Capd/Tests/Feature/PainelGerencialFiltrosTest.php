<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\PainelGerencialService;
use Modules\OrgChart\Models\OrgUnit;
use Tests\TestCase;

final class PainelGerencialFiltrosTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private PainelGerencialService $painelService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Prefeitura Municipal Teste',
            'slug'   => 'pref-teste',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->painelService = app(PainelGerencialService::class);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_filtros_combinados_com_e_estrito_e_drill_down_org_chart(): void
    {
        // 1. Cria nós hierárquicos do OrgChart (Secretaria de Educação -> Depto de Ensino Fundamental)
        $secretaria = OrgUnit::create([
            'name'      => 'Secretaria Municipal de Educação',
            'code'      => 'SMED',
            'type'      => 'secretaria',
            'level'     => 1,
            'path'      => '1',
            'order'     => 1,
            'is_active' => true,
        ]);

        $departamento = OrgUnit::create([
            'name'      => 'Departamento de Ensino Fundamental',
            'code'      => 'DEF',
            'type'      => 'departamento',
            'parent_id' => $secretaria->id,
            'level'     => 2,
            'path'      => "{$secretaria->path}.{$secretaria->id}",
            'order'     => 1,
            'is_active' => true,
        ]);

        $secSaude = OrgUnit::create([
            'name'      => 'Secretaria Municipal de Saúde',
            'code'      => 'SMS',
            'type'      => 'secretaria',
            'level'     => 1,
            'path'      => '2',
            'order'     => 2,
            'is_active' => true,
        ]);

        // 2. Cria Ciclo de Avaliação
        $ciclo = CicloAvaliacao::create([
            'ano_competencia'           => 2026,
            'nome'                      => 'Ciclo 2026',
            'data_inicio'               => '2026-01-01',
            'data_fim'                  => '2026-12-31',
            'data_inicio_avaliacao'     => '2026-01-01',
            'data_fim_avaliacao'        => '2026-12-31',
            'data_limite_preenchimento' => '2026-11-30',
            'data_limite_recurso'       => '2026-12-15',
            'status'                    => CicloAvaliacao::STATUS_EM_AVALIACAO,
        ]);

        // 3. Usuários e Servidores
        $userAvaliador = User::create([
            'name'     => 'Chefia Imediata',
            'email'    => 'chefia@teste.gov.br',
            'password' => bcrypt('password'),
        ]);

        $user1 = User::create(['name' => 'Professora Ana', 'email' => 'ana@teste.gov.br', 'password' => bcrypt('password')]);
        $servidor1 = Servidor::create([
            'user_id'            => $user1->id,
            'matricula'          => 'MAT-101',
            'nome_completo'      => 'Ana Souza',
            'cpf'                => '111.111.111-11',
            'cargo_efetivo'      => 'Professora PB',
            'orgao_lotacao'      => 'Educação',
            'org_unit_id'        => $departamento->id, // Lotada no departamento filho da secretaria
            'chefia_imediata_id' => $userAvaliador->id,
            'metadata'           => ['plano_carreira' => 'MAGISTERIO'],
        ]);

        $user2 = User::create(['name' => 'Médico Bruno', 'email' => 'bruno@teste.gov.br', 'password' => bcrypt('password')]);
        $servidor2 = Servidor::create([
            'user_id'            => $user2->id,
            'matricula'          => 'MAT-102',
            'nome_completo'      => 'Bruno Lima',
            'cpf'                => '222.222.222-22',
            'cargo_efetivo'      => 'Médico Clínico',
            'orgao_lotacao'      => 'Saúde',
            'org_unit_id'        => $secSaude->id,
            'chefia_imediata_id' => $userAvaliador->id,
            'metadata'           => ['plano_carreira' => 'GERAL'],
        ]);

        // 4. Cria avaliações: Servidor 1 com nota 9.80 (extrema/auditoria); Servidor 2 com nota 6.50
        Avaliacao::create([
            'ciclo_id'            => $ciclo->id,
            'servidor_id'         => $user1->id,
            'avaliador_id'        => $userAvaliador->id,
            'nota_final'          => '9.80',
            'data_conclusao'      => now(),
            'elegivel_progressao' => true,
            'homologada'          => false,
            'respostas_fatores'   => ['F1' => ['grau' => 5]],
        ]);

        Avaliacao::create([
            'ciclo_id'            => $ciclo->id,
            'servidor_id'         => $user2->id,
            'avaliador_id'        => $userAvaliador->id,
            'nota_final'          => '6.50',
            'data_conclusao'      => now(),
            'elegivel_progressao' => false,
            'homologada'          => false,
            'respostas_fatores'   => ['F1' => ['grau' => 3]],
        ]);

        // TESTE 1: Drill-down do OrgChart (filtrando por secretaria SMED deve achar o servidor do departamento DEF)
        $resultadoSmed = $this->painelService->listarServidoresComFiltros([
            'ciclo_id'    => $ciclo->id,
            'org_unit_id' => $secretaria->id,
        ]);
        self::assertSame(1, $resultadoSmed->total());
        self::assertSame('MAT-101', $resultadoSmed->items()[0]->matricula);

        // TESTE 2: Filtro combinado com E: Secretaria SMED + Cargo Professor + Faixa de Nota acima_9_5
        $resultadoCombinado = $this->painelService->listarServidoresComFiltros([
            'ciclo_id'    => $ciclo->id,
            'org_unit_id' => $secretaria->id,
            'cargo'       => 'Professor',
            'faixa_nota'  => 'acima_9_5',
        ]);
        self::assertSame(1, $resultadoCombinado->total());

        // TESTE 3: Filtro combinado conflitante (Secretaria SMED + Faixa 6_a_7) deve retornar vazio
        $resultadoVazio = $this->painelService->listarServidoresComFiltros([
            'ciclo_id'    => $ciclo->id,
            'org_unit_id' => $secretaria->id,
            'faixa_nota'  => '6_a_7',
        ]);
        self::assertSame(0, $resultadoVazio->total());

        // TESTE 4: KPIs do topo
        $kpis = $this->painelService->calcularKpis($ciclo->id);
        self::assertSame(2, $kpis['total_servidores']);
        self::assertSame(100.0, $kpis['percentual_concluidas']);
        self::assertSame(1, $kpis['notas_extremas_auditoria']); // Nota 9.80

        // TESTE 5: Exportação em CSV
        $csv = $this->painelService->exportarCsv(['ciclo_id' => $ciclo->id]);
        self::assertStringContainsString('MAT-101', $csv);
        self::assertStringContainsString('Ana Souza', $csv);
        self::assertStringContainsString('9.80', $csv);
    }
}

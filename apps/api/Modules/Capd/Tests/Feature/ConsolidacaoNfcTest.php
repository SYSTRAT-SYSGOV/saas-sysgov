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
use Tests\TestCase;

/**
 * Testes de Consolidação de NFC e Ranking de Progressão (RN-02, RN-04, RN-05, RF-12).
 */
final class ConsolidacaoNfcTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private CicloAvaliacao $ciclo;
    private Servidor $servidorA;
    private Servidor $servidorB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Consolidacao',
            'slug'   => 'pref-consolidacao',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create([
            'name'     => 'Avaliador Admin',
            'email'    => 'admin.consolidacao@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $userA = User::create(['name' => 'Carlos Silveira', 'email' => 'carlos@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $userB = User::create(['name' => 'Mariana Souza', 'email' => 'mariana@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        $this->servidorA = Servidor::create([
            'tenant_id'             => $this->tenant->id,
            'user_id'               => $userA->id,
            'matricula'             => 'MAT-001',
            'cpf'                   => '12345678901',
            'nome_completo'         => 'Carlos Silveira',
            'data_nascimento'       => '1980-05-15',
            'data_admissao'         => '2015-02-01',
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Contador',
            'orgao_lotacao'         => 'Secretaria de Finanças',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        $this->servidorB = Servidor::create([
            'tenant_id'             => $this->tenant->id,
            'user_id'               => $userB->id,
            'matricula'             => 'MAT-002',
            'cpf'                   => '98765432100',
            'nome_completo'         => 'Mariana Souza',
            'data_nascimento'       => '1985-10-20',
            'data_admissao'         => '2018-06-10',
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Contador',
            'orgao_lotacao'         => 'Secretaria de Finanças',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        $this->ciclo = CicloAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'nome'            => 'Ciclo 2026 (Etapa 3 - Trienal)',
            'ano_competencia' => 2026,
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
            'status'          => CicloAvaliacao::STATUS_ABERTO,
            'etapa_cadencia'  => 3,
            'nota_corte_nfc'  => '70.00',
        ]);

        // Cria avaliações concluídas com notas
        Avaliacao::create([
            'tenant_id'         => $this->tenant->id,
            'ciclo_id'          => $this->ciclo->id,
            'servidor_id'       => $this->servidorA->user_id,
            'avaliador_id'      => $this->user->id,
            'tipo_avaliacao'    => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao'  => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F1' => ['grau' => 4, 'pontos' => 85.50]],
            'nota_final'        => '85.50',
            'homologada'        => true,
            'data_conclusao'    => now(),
        ]);

        Avaliacao::create([
            'tenant_id'         => $this->tenant->id,
            'ciclo_id'          => $this->ciclo->id,
            'servidor_id'       => $this->servidorB->user_id,
            'avaliador_id'      => $this->user->id,
            'tipo_avaliacao'    => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao'  => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F1' => ['grau' => 2, 'pontos' => 62.00]],
            'nota_final'        => '62.00',
            'homologada'        => true,
            'data_conclusao'    => now(),
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_calcula_nfc_dos_servidores_do_ciclo(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson("/api/capd/consolidacao/{$this->ciclo->id}/nfc");

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(2, $data['total']);
        $this->assertEquals(1, $data['aptos']);
        $this->assertEquals(1, $data['inaptos']);

        $carlos = collect($data['servidores'])->firstWhere('matricula', 'MAT-001');
        $this->assertNotNull($carlos);
        $this->assertEquals('85.50', $carlos['nfc']);
        $this->assertTrue($carlos['elegivel']);

        $mariana = collect($data['servidores'])->firstWhere('matricula', 'MAT-002');
        $this->assertNotNull($mariana);
        $this->assertEquals('62.00', $mariana['nfc']);
        $this->assertFalse($mariana['elegivel']);
    }

    public function test_ranking_de_progressao_com_criterios_de_desempate(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson("/api/capd/consolidacao/{$this->ciclo->id}/ranking");

        $response->assertStatus(200);
        $data = $response->json();

        // Apenas aptos entram no ranking de progressão (RN-04/RN-05)
        $this->assertEquals(1, $data['total']);
        $ranking = $data['ranking'];

        $this->assertEquals(1, $ranking[0]['posicao']);
        $this->assertEquals('Carlos Silveira', $ranking[0]['nome']);
        $this->assertEquals('85.50', $ranking[0]['nfc']);
    }

    public function test_processamento_da_consolidacao_cria_pmds_para_inaptos(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/consolidacao/{$this->ciclo->id}/processar");

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertArrayHasKey('pmds_gerados', $data);
        $this->assertEquals(1, $data['pmds_gerados']); // Mariana (62.00 < 70.00 nota de corte)
    }

    public function test_processamento_persiste_consolidacao_trienal_por_servidor(): void
    {
        $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/consolidacao/{$this->ciclo->id}/processar")
            ->assertStatus(200);

        $this->assertDatabaseHas('capd_consolidacoes', [
            'tenant_id'           => $this->tenant->id,
            'servidor_id'         => $this->servidorA->id,
            'trienio'             => 2024,
            'nfc'                 => '85.50',
            'conceito'            => 'Bom',
            'elegivel_progressao' => true,
            'versao'              => 1,
        ]);

        $this->assertDatabaseHas('capd_consolidacoes', [
            'tenant_id'           => $this->tenant->id,
            'servidor_id'         => $this->servidorB->id,
            'trienio'             => 2024,
            'nfc'                 => '62.00',
            'elegivel_progressao' => false,
            'versao'              => 1,
        ]);
    }

    public function test_reprocessar_consolidacao_cria_nova_versao_e_historico_lista_ambas(): void
    {
        $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/consolidacao/{$this->ciclo->id}/processar")
            ->assertStatus(200);

        $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/consolidacao/{$this->ciclo->id}/processar")
            ->assertStatus(200);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson("/api/capd/consolidacao/{$this->ciclo->id}/historico");

        $response->assertStatus(200);
        $data = $response->json();

        $doServidorA = collect($data['consolidacoes'])
            ->where('servidor_id', $this->servidorA->id)
            ->values();

        $this->assertCount(2, $doServidorA);
        $this->assertEqualsCanonicalizing([1, 2], $doServidorA->pluck('versao')->all());
    }
}

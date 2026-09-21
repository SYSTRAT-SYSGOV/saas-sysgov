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
 * Dashboard Analítico & BI — Evolução Entre Ciclos (PainelGerencialService::evolucaoCiclos).
 * `nota_final` é NFD, escala 0–10 (elegivel_progressao = nota_final >= 7,00).
 */
final class EvolucaoCiclosTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Município de Araucária Evolucao', 'slug' => 'pref-evolucao', 'type' => 'prefeitura', 'status' => 'active',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create(['name' => 'Comissao Evolucao', 'email' => 'comissao.evolucao@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'is_platform_admin' => true]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function criarServidor(Tenant $tenant, string $matricula): Servidor
    {
        $u = User::create(['name' => "Servidor {$matricula}", 'email' => strtolower($matricula) . '@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        return Servidor::create([
            'tenant_id' => $tenant->id, 'user_id' => $u->id, 'matricula' => $matricula,
            'cpf' => substr(str_pad((string) crc32($matricula), 11, '0'), 0, 11),
            'nome_completo' => "Servidor {$matricula}", 'data_nascimento' => '1985-01-01', 'data_admissao' => '2018-01-01',
            'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps', 'cargo_efetivo' => 'Analista',
            'orgao_lotacao' => 'Secretaria de Finanças', 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);
    }

    private function criarAvaliacao(Tenant $tenant, CicloAvaliacao $ciclo, Servidor $servidor, ?string $notaFinal, bool $concluida = true): Avaliacao
    {
        return Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id,
            'servidor_id' => $servidor->user_id, 'avaliador_id' => $this->user->id,
            'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL, 'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F1' => ['grau' => 4, 'pontos' => 8.50]],
            'nota_final' => $notaFinal,
            'homologada' => false,
            'data_conclusao' => $concluida ? now() : null,
        ]);
    }

    public function test_evolucao_ciclos_retorna_media_e_taxa_por_ciclo_ordenado_por_ano(): void
    {
        $ciclo2025 = CicloAvaliacao::create([
            'tenant_id' => $this->tenant->id, 'nome' => 'Ciclo 2025', 'ano_referencia' => 2025, 'ano_competencia' => 2025,
            'data_inicio' => '2025-01-01', 'data_fim' => '2025-12-31',
        ]);
        $ciclo2026 = CicloAvaliacao::create([
            'tenant_id' => $this->tenant->id, 'nome' => 'Ciclo 2026', 'ano_referencia' => 2026, 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $s1 = $this->criarServidor($this->tenant, 'MAT-E1');
        $s2 = $this->criarServidor($this->tenant, 'MAT-E2');

        // Ciclo 2025: duas avaliações concluídas, NFD 6,00 e 8,00 -> média 7,00
        $this->criarAvaliacao($this->tenant, $ciclo2025, $s1, '6.00');
        $this->criarAvaliacao($this->tenant, $ciclo2025, $s2, '8.00');

        // Ciclo 2026: uma concluída (NFD 9,00) e uma pendente -> taxa de conclusão 50%
        $this->criarAvaliacao($this->tenant, $ciclo2026, $s1, '9.00');
        $this->criarAvaliacao($this->tenant, $ciclo2026, $s2, null, concluida: false);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/capd/dashboard/evolucao-ciclos');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(2, $data);
        $this->assertSame(2025, $data[0]['ano_referencia']);
        $this->assertEqualsWithDelta(7.0, $data[0]['media_nota'], 0.01);
        $this->assertEqualsWithDelta(100.0, $data[0]['taxa_conclusao'], 0.01);

        $this->assertSame(2026, $data[1]['ano_referencia']);
        $this->assertEqualsWithDelta(9.0, $data[1]['media_nota'], 0.01);
        $this->assertEqualsWithDelta(50.0, $data[1]['taxa_conclusao'], 0.01);
    }

    public function test_evolucao_ciclos_retorna_vazio_para_tenant_sem_ciclos(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/capd/dashboard/evolucao-ciclos');

        $response->assertStatus(200);
        $this->assertSame([], $response->json());
    }

    public function test_usuario_sem_permissao_recebe_403(): void
    {
        $semPermissao = User::create(['name' => 'Servidor Comum Evolucao', 'email' => 'servidor.evolucao@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $semPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $response = $this->actingAs($semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/capd/dashboard/evolucao-ciclos');

        $response->assertStatus(403);
    }

    public function test_evolucao_ciclos_isola_dados_por_tenant(): void
    {
        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $this->tenant->id, 'nome' => 'Ciclo Isolamento', 'ano_referencia' => 2026, 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);
        $servidor = $this->criarServidor($this->tenant, 'MAT-E3');
        $this->criarAvaliacao($this->tenant, $ciclo, $servidor, '5.00');

        $outroTenant = Tenant::create([
            'name' => 'Outro Município', 'slug' => 'pref-outro-evolucao', 'type' => 'prefeitura', 'status' => 'active',
        ]);
        app(TenantContext::class)->set($outroTenant);
        $outroUser = User::create(['name' => 'Comissao Outro', 'email' => 'comissao.outro.evolucao@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'is_platform_admin' => true]);
        $outroUser->tenants()->attach($outroTenant->id, ['status' => 'active', 'is_primary' => true]);
        app(TenantContext::class)->set($this->tenant);

        $response = $this->actingAs($outroUser)
            ->withHeader('X-Tenant-ID', (string) $outroTenant->id)
            ->getJson('/api/capd/dashboard/evolucao-ciclos');

        $response->assertStatus(200);
        $this->assertSame([], $response->json(), 'Dados do tenant de origem não podem vazar para outro tenant.');
    }
}

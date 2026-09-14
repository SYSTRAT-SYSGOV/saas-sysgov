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
 * RF-12 — Relatório de Aderência do Ciclo: evolução de preenchimento por
 * secretaria/departamento, destacando gestores pendentes.
 */
final class RelatorioAderenciaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private CicloAvaliacao $ciclo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Município de Araucária Aderencia', 'slug' => 'pref-aderencia', 'type' => 'prefeitura', 'status' => 'active',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create(['name' => 'Comissao Aderencia', 'email' => 'comissao.aderencia@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'is_platform_admin' => true]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->ciclo = CicloAvaliacao::create([
            'tenant_id' => $this->tenant->id, 'nome' => 'Ciclo Aderencia 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function criarServidor(string $matricula, string $orgao, ?int $chefiaId = null): Servidor
    {
        $u = User::create(['name' => "Servidor {$matricula}", 'email' => strtolower($matricula) . '@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        return Servidor::create([
            'tenant_id' => $this->tenant->id, 'user_id' => $u->id, 'matricula' => $matricula,
            'cpf' => substr(str_pad((string) crc32($matricula), 11, '0'), 0, 11),
            'nome_completo' => "Servidor {$matricula}", 'data_nascimento' => '1985-01-01', 'data_admissao' => '2018-01-01',
            'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps', 'cargo_efetivo' => 'Analista',
            'orgao_lotacao' => $orgao, 'chefia_imediata_id' => $chefiaId, 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);
    }

    private function concluirAvaliacao(Servidor $servidor): void
    {
        Avaliacao::create([
            'tenant_id' => $this->tenant->id, 'ciclo_id' => $this->ciclo->id,
            'servidor_id' => $servidor->user_id, 'avaliador_id' => $this->user->id,
            'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL, 'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F1' => ['grau' => 4, 'pontos' => 85.50]], 'nota_final' => '85.50',
            'homologada' => true, 'data_conclusao' => now(),
        ]);
    }

    public function test_relatorio_agrupa_aderencia_por_secretaria(): void
    {
        $gestor = $this->criarServidor('MAT-G1', 'Secretaria de Finanças');

        $s1 = $this->criarServidor('MAT-F1', 'Secretaria de Finanças', $gestor->id);
        $s2 = $this->criarServidor('MAT-F2', 'Secretaria de Finanças', $gestor->id);
        $s3 = $this->criarServidor('MAT-F3', 'Secretaria de Finanças', $gestor->id);
        $this->criarServidor('MAT-S1', 'Secretaria de Saúde', $gestor->id);

        $this->concluirAvaliacao($s1);
        $this->concluirAvaliacao($s2);
        // s3 e o servidor da Saúde ficam pendentes

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson("/api/capd/relatorios/aderencia?ciclo_id={$this->ciclo->id}");

        $response->assertStatus(200);
        $data = $response->json();

        $financas = collect($data['por_secretaria'])->firstWhere('secretaria', 'Secretaria de Finanças');
        $this->assertSame(4, $financas['total']); // inclui o próprio gestor, sem avaliação
        $this->assertSame(2, $financas['concluidas']);
        $this->assertSame(2, $financas['pendentes']);
        $this->assertEquals(50.0, $financas['percentual_concluidas']);

        $saude = collect($data['por_secretaria'])->firstWhere('secretaria', 'Secretaria de Saúde');
        $this->assertSame(1, $saude['total']);
        $this->assertSame(0, $saude['concluidas']);

        $gestorPendente = collect($data['gestores_pendentes'])->firstWhere('avaliador_id', $gestor->id);
        $this->assertNotNull($gestorPendente);
        // Pendentes sob a gestão direta do gestor: MAT-F3 e MAT-S1 (o próprio
        // gestor não tem chefia_imediata_id, então sua pendência não é
        // atribuída a nenhum gestor — fica só no total geral da secretaria).
        $this->assertSame(2, $gestorPendente['pendentes']);
    }
}

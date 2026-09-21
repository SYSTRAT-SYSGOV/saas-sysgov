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
 * `AvaliacaoController::simularProgressao()` — RN-02/RN-04: a NFC projetada deve converter
 * `nota_final` (NFD, escala 0-10) para a escala 0-100 antes de compará-la ao corte de
 * elegibilidade, exatamente como `ConsolidacaoController::nfc()` já faz.
 *
 * Bug corrigido: antes desta correção, `simularProgressao` comparava `nota_final` bruto (0-10)
 * diretamente ao corte de 70.00, tornando qualquer servidor real sempre "inelegível" na simulação.
 */
final class SimularProgressaoEscalaNfcTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $admin;
    private Servidor $servidor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Município Simulação NFC', 'slug' => 'pref-simulacao-nfc', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $this->admin = User::create(['name' => 'Admin Simulação NFC', 'email' => 'admin.simulacao.nfc@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'is_platform_admin' => true]);
        $this->admin->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidorUser = User::create(['name' => 'Servidor Simulação NFC', 'email' => 'servidor.simulacao.nfc@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $this->servidor = Servidor::create([
            'tenant_id' => $this->tenant->id, 'user_id' => $servidorUser->id, 'matricula' => 'SIM-NFC-001',
            'cpf' => '22233344455', 'nome_completo' => 'Servidor Simulação NFC', 'data_admissao' => now()->subYears(3)->toDateString(),
            'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps', 'cargo_efetivo' => 'Analista',
            'orgao_lotacao' => 'Secretaria de Administração', 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function criarAvaliacaoConcluida(int $ano, string $notaFinalNfd): void
    {
        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $this->tenant->id, 'nome' => "Ciclo {$ano}", 'ano_competencia' => $ano,
            'data_inicio' => "{$ano}-01-01", 'data_fim' => "{$ano}-12-31",
        ]);

        Avaliacao::create([
            'tenant_id' => $this->tenant->id, 'ciclo_id' => $ciclo->id,
            'servidor_id' => $this->servidor->id, 'avaliador_id' => $this->admin->id,
            'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL, 'status_avaliacao' => Avaliacao::STATUS_ATIVA,
            'respostas_fatores' => ['F1' => ['grau' => 4, 'pontos' => 85.0]],
            'nota_final' => $notaFinalNfd,
            'homologada' => false, 'data_conclusao' => now(),
        ]);
    }

    public function test_nfc_projetada_converte_nota_final_nfd_para_escala_0_100(): void
    {
        // Notas NFD reais (0-10): média 7,50 -> NFC projetada deve ser 75.00, não 7.50.
        $this->criarAvaliacaoConcluida(2024, '7.00');
        $this->criarAvaliacaoConcluida(2025, '7.50');
        $this->criarAvaliacaoConcluida(2026, '8.00');

        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson("/api/capd/servidores/{$this->servidor->id}/simular-progressao");

        $response->assertStatus(200);
        $this->assertEqualsWithDelta(75.0, (float) $response->json('nfc_projetada'), 0.01);
        $this->assertTrue($response->json('elegivel_progressao'));
        $this->assertSame('70.00', $response->json('nota_corte'));
    }

    public function test_servidor_com_notas_nfd_reais_abaixo_do_corte_fica_inelegivel(): void
    {
        $this->criarAvaliacaoConcluida(2024, '5.00');
        $this->criarAvaliacaoConcluida(2025, '6.00');
        $this->criarAvaliacaoConcluida(2026, '6.50');

        $response = $this->actingAs($this->admin)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson("/api/capd/servidores/{$this->servidor->id}/simular-progressao");

        $response->assertStatus(200);
        $this->assertEqualsWithDelta(58.33, (float) $response->json('nfc_projetada'), 0.01);
        $this->assertFalse($response->json('elegivel_progressao'));
    }
}

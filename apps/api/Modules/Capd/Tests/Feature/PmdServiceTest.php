<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\PlanoMelhoria;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\PmdService;
use Tests\TestCase;

/**
 * Testes do Plano de Melhoria de Desempenho (PMD) — RF-09.
 */
final class PmdServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private PmdService $pmdService;
    private Servidor $servidor;
    private CicloAvaliacao $ciclo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária PMD',
            'slug'   => 'pref-pmd',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->pmdService = app(PmdService::class);

        $user = User::create([
            'name'     => 'Servidor Teste PMD',
            'email'    => 'servidor.pmd@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);

        $this->servidor = Servidor::create([
            'tenant_id'             => $this->tenant->id,
            'user_id'               => $user->id,
            'matricula'             => 'PMD-001',
            'cpf'                   => '11122233344',
            'nome_completo'         => 'Servidor Teste PMD',
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Assistente Administrativo',
            'orgao_lotacao'         => 'Secretaria de Administração',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        $this->ciclo = CicloAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'nome'            => 'Ciclo Anual 2026 (Etapa 1)',
            'ano_competencia' => 2026,
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
            'status'          => CicloAvaliacao::STATUS_ABERTO,
            'etapa_cadencia'  => 1,
            'nota_corte_nfc'  => '70.00',
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_criar_pmd_automaticamente_para_servidor_com_nfc_abaixo_da_nota_de_corte(): void
    {
        $pmd = $this->pmdService->criarParaServidor(
            $this->servidor,
            $this->ciclo,
            '65.50',
            'Insuficiente',
            null,
            ['objetivos' => 'Capacitação em redação oficial e gestão de processos.']
        );

        $this->assertInstanceOf(PlanoMelhoria::class, $pmd);
        $this->assertEquals($this->servidor->id, $pmd->servidor_id);
        $this->assertEquals($this->ciclo->id, $pmd->ciclo_id);
        $this->assertEquals('65.50', (string) $pmd->nfc_gatilho);
        $this->assertEquals('Insuficiente', $pmd->conceito_atingido);
        $this->assertEquals(PlanoMelhoria::STATUS_ABERTO, $pmd->status);
        $this->assertTrue($pmd->estaAtivo());
    }

    public function test_verificacao_de_evolucao_registra_resultado_evoluiu(): void
    {
        $pmd = $this->pmdService->criarParaServidor(
            $this->servidor,
            $this->ciclo,
            '60.00'
        );

        $resultado = $this->pmdService->verificarEvolucao(
            $pmd,
            '75.00', // Nova NFC > 60.00
            'Servidor concluiu curso e demonstrou clara evolução no desempenho.'
        );

        $this->assertTrue($resultado['evoluiu']);
        $this->assertEquals(PlanoMelhoria::STATUS_VERIFICADO, $pmd->fresh()->status);
        $this->assertNotNull($pmd->fresh()->verificado_em);
    }

    public function test_verificacao_de_evolucao_registra_resultado_nao_evoluiu(): void
    {
        $pmd = $this->pmdService->criarParaServidor(
            $this->servidor,
            $this->ciclo,
            '65.00'
        );

        $resultado = $this->pmdService->verificarEvolucao(
            $pmd,
            '62.00', // Nova NFC <= 65.00
            'Persistem deficiências nos fatores avaliados.'
        );

        $this->assertFalse($resultado['evoluiu']);
        $this->assertEquals(PlanoMelhoria::STATUS_VERIFICADO, $pmd->fresh()->status);
        $this->assertNotNull($pmd->fresh()->verificado_em);
    }

    public function test_concluir_acoes_move_status_de_aberto_para_concluido(): void
    {
        $pmd = $this->pmdService->criarParaServidor($this->servidor, $this->ciclo, '60.00');

        $atualizado = $this->pmdService->concluirAcoes($pmd);

        $this->assertEquals(PlanoMelhoria::STATUS_CONCLUIDO, $atualizado->status);
        $this->assertNotNull($atualizado->concluido_em);
        $this->assertNull($atualizado->verificado_em);
    }

    public function test_concluir_acoes_falha_se_ja_verificado(): void
    {
        $pmd = $this->pmdService->criarParaServidor($this->servidor, $this->ciclo, '60.00');
        $this->pmdService->verificarEvolucao($pmd, '80.00', 'Evoluiu.');

        $this->expectException(\DomainException::class);
        $this->pmdService->concluirAcoes($pmd->fresh());
    }

    public function test_possui_pmd_pendente_no_ciclo_de_verificacao(): void
    {
        $cicloVerificacao = CicloAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'nome'            => 'Ciclo Anual 2027 (Etapa 2)',
            'ano_competencia' => 2027,
            'data_inicio'     => '2027-01-01',
            'data_fim'        => '2027-12-31',
            'status'          => CicloAvaliacao::STATUS_ABERTO,
            'etapa_cadencia'  => 2,
            'nota_corte_nfc'  => '70.00',
        ]);

        $this->pmdService->criarParaServidor($this->servidor, $this->ciclo, '60.00');

        $this->assertTrue(
            $this->pmdService->possuiPmdPendenteNoCiclo($this->servidor->id, $cicloVerificacao->id)
        );
        $this->assertFalse(
            $this->pmdService->possuiPmdPendenteNoCiclo($this->servidor->id, $this->ciclo->id)
        );
    }

    public function test_pmd_verificado_nao_conta_como_pendente_no_ciclo(): void
    {
        $cicloVerificacao = CicloAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'nome'            => 'Ciclo Anual 2027 (Etapa 2)',
            'ano_competencia' => 2027,
            'data_inicio'     => '2027-01-01',
            'data_fim'        => '2027-12-31',
            'status'          => CicloAvaliacao::STATUS_ABERTO,
            'etapa_cadencia'  => 2,
            'nota_corte_nfc'  => '70.00',
        ]);

        $pmd = $this->pmdService->criarParaServidor($this->servidor, $this->ciclo, '60.00');
        $this->pmdService->verificarEvolucao($pmd, '80.00', 'Evoluiu.');

        $this->assertFalse(
            $this->pmdService->possuiPmdPendenteNoCiclo($this->servidor->id, $cicloVerificacao->id)
        );
    }
}

<?php

declare(strict_types=1);

namespace Modules\Procurement\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoArtefato;
use Modules\Procurement\Models\LicitacaoContrato;
use Modules\Procurement\Models\LicitacaoParticipante;
use Modules\Procurement\Models\LicitacaoPreco;
use Modules\Procurement\Services\AuditHMACService;
use Modules\Procurement\Services\BiddingRoomService;
use Modules\Procurement\Services\ContractExecutionService;
use Modules\Procurement\Services\MarketResearchService;
use Modules\Procurement\Services\ProcurementFlowService;
use Modules\Procurement\Tests\TestCase;

final class ProcurementBusinessRulesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $userElaborador;
    private User $userAprovador;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create(['name' => 'Prefeitura de Testes', 'slug' => 'pref-testes', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $this->userElaborador = User::create(['name' => 'João Elaborador', 'email' => 'joao@gov.br', 'password' => 'secret123']);
        $this->userAprovador = User::create(['name' => 'Maria Aprovadora', 'email' => 'maria@gov.br', 'password' => 'secret123']);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    /**
     * RN-002: Pré-requisitos sequenciais (ETP exige DFD aprovado; TR exige Mapa de Preços consolidado)
     */
    public function test_rn_002_sequential_artifacts_validation(): void
    {
        $flow = app(ProcurementFlowService::class);

        $licitacao = Licitacao::create([
            'numero' => 'PE 010/2026',
            'ano' => 2026,
            'modalidade' => 'pregao_eletronico',
            'objeto' => 'Aquisição de equipamentos hospitalares',
            'created_by' => $this->userElaborador->id,
        ]);

        // 1. Tentar ETP sem DFD aprovado deve lançar DomainException
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-002: A elaboração do Estudo Técnico Preliminar (ETP) exige um Documento de Formalização de Demanda (DFD) previamente aprovado.');
        $flow->validateArtifactPrerequisites($licitacao, 'etp');
    }

    /**
     * RN-004: Pesquisa de mercado, cálculo de média e expurgo de outliers > 25%
     */
    public function test_rn_004_market_research_outlier_expurgation(): void
    {
        $market = app(MarketResearchService::class);

        $licitacao = Licitacao::create([
            'numero' => 'PE 020/2026',
            'ano' => 2026,
            'modalidade' => 'pregao_eletronico',
            'objeto' => 'Aquisição de notebooks corporativos',
            'created_by' => $this->userElaborador->id,
        ]);

        // Inserir 4 fontes de pesquisa: 3 em torno de R$ 5.000,00 e 1 discrepante de R$ 12.000,00 (+140% da média)
        LicitacaoPreco::create([
            'tenant_id' => $this->tenant->id,
            'licitacao_id' => $licitacao->id,
            'tipo_fonte' => 'banco_precos',
            'item_descricao' => 'Notebook i7 16GB',
            'fornecedor' => 'Fornecedor A',
            'valor_cents' => 500000, // R$ 5.000,00
            'status' => 'valida',
        ]);
        LicitacaoPreco::create([
            'tenant_id' => $this->tenant->id,
            'licitacao_id' => $licitacao->id,
            'tipo_fonte' => 'pncp',
            'item_descricao' => 'Notebook i7 16GB',
            'fornecedor' => 'Fornecedor B',
            'valor_cents' => 520000, // R$ 5.200,00
            'status' => 'valida',
        ]);
        LicitacaoPreco::create([
            'tenant_id' => $this->tenant->id,
            'licitacao_id' => $licitacao->id,
            'tipo_fonte' => 'cotacao',
            'item_descricao' => 'Notebook i7 16GB',
            'fornecedor' => 'Fornecedor C',
            'valor_cents' => 480000, // R$ 4.800,00
            'status' => 'valida',
        ]);
        $outlierPreco = LicitacaoPreco::create([
            'tenant_id' => $this->tenant->id,
            'licitacao_id' => $licitacao->id,
            'tipo_fonte' => 'cotacao',
            'item_descricao' => 'Notebook i7 16GB',
            'fornecedor' => 'Fornecedor D Outlier',
            'valor_cents' => 1200000, // R$ 12.000,00 (Discrepante)
            'status' => 'valida',
        ]);

        $stats = $market->recalculateMarketPrices($licitacao);

        self::assertSame(1, $stats['outliers_count']);
        self::assertSame(3, $stats['valid_sources_count']);
        self::assertSame('outlier', $outlierPreco->fresh()->status);
        self::assertStringContainsString('Discrepância estatística', $outlierPreco->fresh()->motivo_outlier);
        self::assertSame(500000, $stats['media_cents']); // Média saneada de R$ 5.000,00
    }

    /**
     * RN-009: Bloqueio rígido de aditivos que ultrapassem 25% (ou 50% para obras)
     */
    public function test_rn_009_contract_addendum_strict_limit(): void
    {
        $contractService = app(ContractExecutionService::class);

        $contrato = LicitacaoContrato::create([
            'tenant_id' => $this->tenant->id,
            'numero' => 'CT-2026/0001',
            'objeto' => 'Prestação de serviços de limpeza e conservação predial',
            'fornecedor_nome' => 'Limpeza Total LTDA',
            'fornecedor_cnpj' => '12345678000199',
            'valor_inicial_cents' => 10000000, // R$ 100.000,00
            'valor_atualizado_cents' => 10000000,
            'vigencia_inicio' => '2026-01-01',
            'vigencia_fim' => '2026-12-31',
            'status' => 'vigente',
        ]);

        // Aditivo 1: 20% (R$ 20.000,00) - Permitido
        $aditivo1 = $contractService->createAddendum(
            $contrato,
            '1º TA',
            'aditivo_acrescimo',
            2000000,
            'Acréscimo de 2 novos postos de trabalho'
        );
        self::assertSame(20.0, $aditivo1->percentual_aditivo);

        // Aditivo 2: +10% (Total acumulado: 30% > Limite de 25%) - Deve Bloquear com DomainException
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-009: Limite legal de aditivos excedido');

        $contractService->createAddendum(
            $contrato->fresh(),
            '2º TA',
            'aditivo_acrescimo',
            1000000, // + R$ 10.000,00
            'Tentativa de acréscimo extrapolando o limite'
        );
    }

    /**
     * RN-008: Validação de data de pagamento até 30 dias após o vencimento
     */
    public function test_rn_008_payment_due_date_limit(): void
    {
        $contractService = app(ContractExecutionService::class);

        $contrato = LicitacaoContrato::create([
            'tenant_id' => $this->tenant->id,
            'numero' => 'CT-2026/0002',
            'objeto' => 'Fornecimento de materiais de escritório',
            'fornecedor_nome' => 'Papelaria Central',
            'fornecedor_cnpj' => '98765432000188',
            'valor_inicial_cents' => 5000000,
            'valor_atualizado_cents' => 5000000,
            'vigencia_inicio' => '2026-01-01',
            'vigencia_fim' => '2026-12-31',
        ]);

        // Vencimento: 01/05/2026. Pagamento em 10/06/2026 (40 dias após - excede limite de 30 dias)
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-008: A data de pagamento (2026-06-10) excede o limite legal de 30 dias');

        $contractService->registerPayment(
            $contrato,
            'NF-9988',
            5000000,
            '2026-05-01',
            '2026-06-10'
        );
    }

    /**
     * RN-013: Sala de lances e anti-spam no Redis
     */
    public function test_rn_013_bidding_anti_spam_rejection(): void
    {
        $bidding = app(BiddingRoomService::class);

        $licitacao = Licitacao::create([
            'numero' => 'PE 030/2026',
            'ano' => 2026,
            'modalidade' => 'pregao_eletronico',
            'objeto' => 'Aquisição de combustível',
            'valor_estimado_cents' => 10000000,
            'status' => 'em_disputa',
        ]);

        $part = LicitacaoParticipante::create([
            'tenant_id' => $this->tenant->id,
            'licitacao_id' => $licitacao->id,
            'razao_social' => 'Posto Estrela do Sul',
            'cnpj' => '11222333000144',
            'status' => 'credenciado',
        ]);

        // Lance 1: R$ 90.000,00
        $lance1 = $bidding->placeBid($licitacao, $part, 9000000);
        self::assertSame(9000000, $lance1->valor_cents);

        // Lance 2 imediato pelo mesmo concorrente: deve ser rejeitado pelo anti-spam
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-013 Anti-Spam: Aguarde');

        $bidding->placeBid($licitacao, $part, 8900000);
    }

    /**
     * RN-020: Auditoria imutável com assinatura HMAC encadeada
     */
    public function test_rn_020_audit_hmac_chain(): void
    {
        $auditService = app(AuditHMACService::class);

        $log1 = $auditService->record(
            'procurement',
            'licitacao.created',
            'Licitação #1',
            null,
            ['numero' => 'PE 001/2026']
        );

        $log2 = $auditService->record(
            'procurement',
            'licitacao.published',
            'Licitação #1',
            ['status' => 'rascunho'],
            ['status' => 'publicada']
        );

        self::assertArrayHasKey('_hmac_signature', $log1->after);
        self::assertArrayHasKey('_hmac_signature', $log2->after);
        self::assertSame($log1->after['_hmac_signature'], $log2->after['_previous_hash']);
    }
}

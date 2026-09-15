<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Licita\Enums\FaseLicita;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Enums\StatusPesquisaPreco;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoService;
use Modules\Licita\Services\PesquisaPrecoService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

final class PesquisaPrecoWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private function criarProcesso(User $elaborador): Processo
    {
        return app(ProcessoService::class)->criar(['objeto' => null], $elaborador);
    }

    /**
     * @return array<string, mixed>
     */
    private function dadosDfd(): array
    {
        return [
            'data_previsao' => '2026-12-01',
            'grau_prioridade' => GrauPrioridade::Media->value,
            'justificativa' => 'Necessidade de contratação de serviço continuado de limpeza.',
            'objeto' => 'Contratação de empresa especializada em serviços de limpeza predial.',
            'equipe_planejamento' => [
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
                ['nome' => 'Sicrana', 'cargo' => 'Gestora', 'matricula' => '002'],
            ],
            'itens' => [
                [
                    'tipo' => 'servico',
                    'codigo' => '12345',
                    'descricao' => 'Serviço de limpeza predial',
                    'unidade_medida' => 'mês',
                    'quantidade' => 12,
                    'valor_unitario' => 5000,
                ],
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function dadosRiscos(): array
    {
        return [
            [
                'descricao' => 'Apresentação de documentação irregular pelo fornecedor.',
                'fase' => 'selecao_fornecedor',
                'probabilidade' => 2,
                'impacto' => 4,
                'alocacao' => 'contratada',
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function cotacoes(float $base): array
    {
        return [
            ['fonte' => 'Painel de Preços', 'fornecedor' => 'Fornecedor A', 'valor_unitario' => $base],
            ['fonte' => 'Fornecedor direto', 'fornecedor' => 'Fornecedor B', 'valor_unitario' => $base + 200],
            ['fonte' => 'Ata de registro de preços', 'fornecedor' => 'Fornecedor C', 'valor_unitario' => $base - 100],
        ];
    }

    /**
     * @return array{0: Tenant, 1: User, 2: User}
     */
    private function setUpTenantEUsuarios(): array
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $elaborador = User::create(['name' => 'Elaborador', 'email' => 'elaborador@teste.gov.br', 'password' => bcrypt('secret')]);
        $aprovador = User::create(['name' => 'Aprovador', 'email' => 'aprovador@teste.gov.br', 'password' => bcrypt('secret')]);

        return [$tenant, $elaborador, $aprovador];
    }

    /**
     * DFD, ETP e Mapa de Riscos aprovados (pré-requisito de toda a Pesquisa
     * de Preços) — devolve o processo já pronto para iniciá-la.
     */
    private function processoComMapaRiscoAprovado(User $elaborador, User $aprovador): Processo
    {
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfdService->aprovar($dfd, $aprovador);

        $etpService = app(EtpService::class);
        $etp = $etpService->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $elaborador);
        $etp = $etpService->enviarParaRevisao($etp, $elaborador);
        $etpService->aprovar($etp, $aprovador);

        $mapaRiscoService = app(MapaRiscoService::class);
        $mapaRisco = $mapaRiscoService->criar($processo->fresh(), ['riscos' => $this->dadosRiscos()], $elaborador);
        $mapaRisco = $mapaRiscoService->enviarParaRevisao($mapaRisco, $elaborador);
        $mapaRiscoService->aprovar($mapaRisco, $aprovador);

        return $processo->fresh();
    }

    public function test_nao_permite_criar_pesquisa_de_precos_sem_mapa_de_riscos_aprovado(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Mapa de Riscos deste processo precisa estar aprovado');
        app(PesquisaPrecoService::class)->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);
    }

    public function test_pesquisa_de_precos_nasce_com_itens_copiados_do_dfd(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRiscoAprovado($elaborador, $aprovador);

        $pesquisaPreco = app(PesquisaPrecoService::class)->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);

        self::assertCount(1, $pesquisaPreco->itens);
        self::assertSame('Serviço de limpeza predial', $pesquisaPreco->itens[0]['descricao']);
        self::assertSame([], $pesquisaPreco->itens[0]['cotacoes']);
        self::assertSame($processo->mapaRisco->equipe_planejamento, $pesquisaPreco->equipe_planejamento);
    }

    public function test_nao_permite_enviar_para_revisao_sem_minimo_de_cotacoes_por_item(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRiscoAprovado($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $pesquisaPreco = $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-006');
        $service->enviarParaRevisao($pesquisaPreco, $elaborador);
    }

    public function test_fluxo_completo_de_aprovacao_avanca_processo_para_tr(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRiscoAprovado($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $pesquisaPreco = $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);

        $itens = $pesquisaPreco->itens;
        $itens[0]['cotacoes'] = $this->cotacoes(5200);
        $pesquisaPreco = $service->atualizar($pesquisaPreco, ['itens' => $itens], $elaborador);

        $pesquisaPreco = $service->enviarParaRevisao($pesquisaPreco, $elaborador);
        self::assertSame(StatusPesquisaPreco::EmRevisao->value, $pesquisaPreco->status);

        $pesquisaPreco = $service->aprovar($pesquisaPreco, $aprovador, 'De acordo.');
        self::assertSame(StatusPesquisaPreco::Aprovado->value, $pesquisaPreco->status);
        self::assertSame($aprovador->id, $pesquisaPreco->aprovado_por);

        self::assertSame(FaseLicita::Tr->value, $processo->fresh()->fase_atual);
    }

    public function test_elaborador_nao_pode_aprovar_a_propria_pesquisa_de_precos(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRiscoAprovado($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $pesquisaPreco = $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);
        $itens = $pesquisaPreco->itens;
        $itens[0]['cotacoes'] = $this->cotacoes(5200);
        $pesquisaPreco = $service->atualizar($pesquisaPreco, ['itens' => $itens], $elaborador);
        $pesquisaPreco = $service->enviarParaRevisao($pesquisaPreco, $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-005');
        $service->aprovar($pesquisaPreco, $elaborador);
    }

    public function test_pesquisa_de_precos_aprovada_e_imutavel(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRiscoAprovado($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $pesquisaPreco = $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);
        $itens = $pesquisaPreco->itens;
        $itens[0]['cotacoes'] = $this->cotacoes(5200);
        $pesquisaPreco = $service->atualizar($pesquisaPreco, ['itens' => $itens], $elaborador);
        $pesquisaPreco = $service->enviarParaRevisao($pesquisaPreco, $elaborador);
        $pesquisaPreco = $service->aprovar($pesquisaPreco, $aprovador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('imutável');
        $service->atualizar($pesquisaPreco, ['itens' => []], $elaborador);
    }

    public function test_nao_permite_criar_segunda_pesquisa_de_precos_no_mesmo_processo(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRiscoAprovado($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('já possui uma Pesquisa de Preços');
        $service->criar($processo->fresh(), ['metodo_referencia' => 'mediana'], $elaborador);
    }
}

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
use Modules\Licita\Enums\StatusAprovacaoFinal;
use Modules\Licita\Enums\StatusEtp;
use Modules\Licita\Enums\StatusMapaRisco;
use Modules\Licita\Enums\StatusPesquisaPreco;
use Modules\Licita\Enums\StatusTr;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\AprovacaoFinalService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoService;
use Modules\Licita\Services\PesquisaPrecoService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Services\TrService;
use Modules\Licita\Tests\TestCase;

final class AprovacaoFinalWorkflowTest extends TestCase
{
    use RefreshDatabase;

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

        $planejador = User::create(['name' => 'Planejador', 'email' => 'planejador@teste.gov.br', 'password' => bcrypt('secret')]);
        $ordenador = User::create(['name' => 'Ordenador', 'email' => 'ordenador@teste.gov.br', 'password' => bcrypt('secret')]);

        return [$tenant, $planejador, $ordenador];
    }

    /**
     * Processo com DFD aprovado, ETP, Mapa de Riscos e Pesquisa de Preços
     * (com cotações completas) — pronto para solicitar a aprovação final.
     */
    private function processoPronto(User $planejador): Processo
    {
        $processo = app(ProcessoService::class)->criar(['objeto' => null], $planejador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $planejador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $planejador);
        // Aprovador do DFD é um terceiro usuário só pra satisfazer a RN-005
        // do próprio DFD (que não muda) — não participa do resto do teste.
        $dfdService->aprovar($dfd, $this->aprovadorDfdDeApoio());

        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $planejador);
        app(MapaRiscoService::class)->criar($processo->fresh(), ['riscos' => $this->dadosRiscos()], $planejador);
        $pesquisaPreco = app(PesquisaPrecoService::class)->criar($processo->fresh(), ['metodo_referencia' => 'mediana'], $planejador);
        $itens = $pesquisaPreco->itens;
        $itens[0]['cotacoes'] = $this->cotacoes(5200);
        app(PesquisaPrecoService::class)->atualizar($pesquisaPreco, ['itens' => $itens], $planejador);
        app(TrService::class)->criar($processo->fresh(), ['criterio_julgamento' => 'menor_preco'], $planejador);

        return $processo->fresh();
    }

    private function aprovadorDfdDeApoio(): User
    {
        return User::create(['name' => 'Aprovador DFD', 'email' => 'aprovador.dfd@teste.gov.br', 'password' => bcrypt('secret')]);
    }

    public function test_nao_permite_solicitar_sem_os_tres_artefatos(): void
    {
        [, $planejador] = $this->setUpTenantEUsuarios();
        $processo = app(ProcessoService::class)->criar(['objeto' => null], $planejador);
        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $planejador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $planejador);
        $dfdService->aprovar($dfd, $this->aprovadorDfdDeApoio());

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Cadastre o ETP, o Mapa de Riscos, a Pesquisa de Preços e o Termo de Referência');
        app(AprovacaoFinalService::class)->solicitar($processo->fresh(), $planejador);
    }

    public function test_nao_permite_solicitar_com_pesquisa_de_precos_incompleta(): void
    {
        [, $planejador] = $this->setUpTenantEUsuarios();
        $processo = app(ProcessoService::class)->criar(['objeto' => null], $planejador);
        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $planejador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $planejador);
        $dfdService->aprovar($dfd, $this->aprovadorDfdDeApoio());
        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $planejador);
        app(MapaRiscoService::class)->criar($processo->fresh(), ['riscos' => $this->dadosRiscos()], $planejador);
        // Pesquisa de Preços criada mas sem cotações — RN-006 deve bloquear.
        app(PesquisaPrecoService::class)->criar($processo->fresh(), ['metodo_referencia' => 'mediana'], $planejador);
        app(TrService::class)->criar($processo->fresh(), [], $planejador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-006');
        app(AprovacaoFinalService::class)->solicitar($processo->fresh(), $planejador);
    }

    public function test_solicitar_avanca_fase_e_cria_aprovacao_pendente(): void
    {
        [, $planejador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoPronto($planejador);

        $aprovacao = app(AprovacaoFinalService::class)->solicitar($processo, $planejador);

        self::assertSame(StatusAprovacaoFinal::Pendente->value, $aprovacao->status);
        self::assertSame($planejador->id, $aprovacao->solicitado_por);
        self::assertSame(FaseLicita::AprovacaoOrdenador->value, $processo->fresh()->fase_atual);
    }

    public function test_ordenador_nao_pode_aprovar_a_propria_solicitacao(): void
    {
        [, $planejador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoPronto($planejador);
        $service = app(AprovacaoFinalService::class);
        $service->solicitar($processo, $planejador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-005');
        $service->aprovar($processo->fresh(), $planejador);
    }

    public function test_aprovar_trava_os_quatro_artefatos_de_uma_vez_e_conclui_o_processo(): void
    {
        [, $planejador, $ordenador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoPronto($planejador);
        $service = app(AprovacaoFinalService::class);
        $service->solicitar($processo, $planejador);

        $aprovacao = $service->aprovar($processo->fresh(), $ordenador, 'De acordo com o pacote apresentado.');

        self::assertSame(StatusAprovacaoFinal::Aprovada->value, $aprovacao->status);
        self::assertSame($ordenador->id, $aprovacao->aprovado_por);

        $processoFresco = $processo->fresh();
        self::assertSame(FaseLicita::Concluido->value, $processoFresco->fase_atual);
        self::assertSame(StatusEtp::Aprovado->value, $processoFresco->etp->status);
        self::assertSame(StatusMapaRisco::Aprovado->value, $processoFresco->mapaRisco->status);
        self::assertSame(StatusPesquisaPreco::Aprovado->value, $processoFresco->pesquisaPreco->status);
        self::assertSame(StatusTr::Aprovado->value, $processoFresco->tr->status);
        self::assertSame($ordenador->id, $processoFresco->etp->aprovado_por);
        self::assertSame($ordenador->id, $processoFresco->tr->aprovado_por);
    }

    public function test_etp_fica_imutavel_depois_da_aprovacao_final(): void
    {
        [, $planejador, $ordenador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoPronto($planejador);
        $service = app(AprovacaoFinalService::class);
        $service->solicitar($processo, $planejador);
        $service->aprovar($processo->fresh(), $ordenador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('imutável');
        app(EtpService::class)->atualizar($processo->fresh()->etp, ['conteudo' => 'Tentativa pós-aprovação'], $planejador);
    }

    public function test_rejeitar_devolve_para_em_elaboracao_sem_travar_documentos(): void
    {
        [, $planejador, $ordenador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoPronto($planejador);
        $service = app(AprovacaoFinalService::class);
        $service->solicitar($processo, $planejador);

        $aprovacao = $service->rejeitar($processo->fresh(), $ordenador, 'Faltou detalhar a metodologia de cálculo do valor de referência.');

        self::assertSame(StatusAprovacaoFinal::Rejeitada->value, $aprovacao->status);
        self::assertSame('Faltou detalhar a metodologia de cálculo do valor de referência.', $aprovacao->motivo_rejeicao);

        $processoFresco = $processo->fresh();
        self::assertSame(FaseLicita::EmElaboracao->value, $processoFresco->fase_atual);
        self::assertSame(StatusEtp::Rascunho->value, $processoFresco->etp->status);
        self::assertSame(StatusTr::Rascunho->value, $processoFresco->tr->status);

        // Equipe de planejamento continua podendo editar normalmente.
        $etpAtualizado = app(EtpService::class)->atualizar($processoFresco->etp, ['conteudo' => 'ETP corrigido após rejeição.'], $planejador);
        self::assertSame('ETP corrigido após rejeição.', $etpAtualizado->conteudo);
    }

    public function test_permite_resubmeter_apos_rejeicao(): void
    {
        [, $planejador, $ordenador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoPronto($planejador);
        $service = app(AprovacaoFinalService::class);
        $service->solicitar($processo, $planejador);
        $service->rejeitar($processo->fresh(), $ordenador, 'Ajustar valor de referência.');

        $aprovacao = $service->solicitar($processo->fresh(), $planejador);

        self::assertSame(StatusAprovacaoFinal::Pendente->value, $aprovacao->status);
        self::assertNull($aprovacao->motivo_rejeicao);
        self::assertSame(FaseLicita::AprovacaoOrdenador->value, $processo->fresh()->fase_atual);
    }
}

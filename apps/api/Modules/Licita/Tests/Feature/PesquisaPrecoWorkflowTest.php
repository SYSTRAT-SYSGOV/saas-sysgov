<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
     * DFD aprovado + ETP + Mapa de Riscos criados (pré-requisito da
     * Pesquisa de Preços) — devolve o processo pronto para iniciá-la.
     */
    private function processoComMapaRisco(User $elaborador, User $aprovador): Processo
    {
        $processo = $this->criarProcesso($elaborador);

        $dfdService = app(DfdService::class);
        $dfd = $dfdService->criar($processo, $this->dadosDfd(), $elaborador);
        $dfd = $dfdService->enviarParaRevisao($dfd, $elaborador);
        $dfdService->aprovar($dfd, $aprovador);

        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $elaborador);
        app(MapaRiscoService::class)->criar($processo->fresh(), ['riscos' => $this->dadosRiscos()], $elaborador);

        return $processo->fresh();
    }

    public function test_nao_permite_criar_pesquisa_de_precos_sem_mapa_de_riscos(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuarios();
        $processo = $this->criarProcesso($elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Cadastre o Mapa de Riscos');
        app(PesquisaPrecoService::class)->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);
    }

    public function test_pesquisa_de_precos_nasce_com_itens_copiados_do_dfd(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRisco($elaborador, $aprovador);

        $pesquisaPreco = app(PesquisaPrecoService::class)->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);

        self::assertCount(1, $pesquisaPreco->itens);
        self::assertSame('Serviço de limpeza predial', $pesquisaPreco->itens[0]['descricao']);
        self::assertSame([], $pesquisaPreco->itens[0]['cotacoes']);
        self::assertSame($processo->mapaRisco->equipe_planejamento, $pesquisaPreco->equipe_planejamento);
        // 'tipo' é copiado do DFD (material/servico) — usado pela busca de preços por IA para saber se o código é CATMAT ou CATSER.
        self::assertSame('servico', $pesquisaPreco->itens[0]['tipo']);
    }

    public function test_validar_completude_bloqueia_sem_minimo_de_cotacoes_por_item(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRisco($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $pesquisaPreco = $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('RN-006');
        $service->validarCompletude($pesquisaPreco);
    }

    public function test_validar_completude_passa_com_minimo_de_cotacoes_por_item(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRisco($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $pesquisaPreco = $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);
        $itens = $pesquisaPreco->itens;
        $itens[0]['cotacoes'] = $this->cotacoes(5200);
        $pesquisaPreco = $service->atualizar($pesquisaPreco, ['itens' => $itens], $elaborador);

        // Não deve lançar DomainException — item tem 3 cotações válidas.
        $service->validarCompletude($pesquisaPreco);
        $this->expectNotToPerformAssertions();
    }

    public function test_pesquisa_de_precos_continua_editavel_a_qualquer_momento(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRisco($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $pesquisaPreco = $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);
        $itens = $pesquisaPreco->itens;
        $itens[0]['cotacoes'] = $this->cotacoes(5200);
        $pesquisaPreco = $service->atualizar($pesquisaPreco, ['itens' => $itens], $elaborador);

        self::assertSame(StatusPesquisaPreco::Rascunho->value, $pesquisaPreco->status);
        self::assertCount(3, $pesquisaPreco->itens[0]['cotacoes']);
    }

    public function test_nao_permite_criar_segunda_pesquisa_de_precos_no_mesmo_processo(): void
    {
        [, $elaborador, $aprovador] = $this->setUpTenantEUsuarios();
        $processo = $this->processoComMapaRisco($elaborador, $aprovador);

        $service = app(PesquisaPrecoService::class);
        $service->criar($processo, ['metodo_referencia' => 'mediana'], $elaborador);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('já possui uma Pesquisa de Preços');
        $service->criar($processo->fresh(), ['metodo_referencia' => 'mediana'], $elaborador);
    }
}

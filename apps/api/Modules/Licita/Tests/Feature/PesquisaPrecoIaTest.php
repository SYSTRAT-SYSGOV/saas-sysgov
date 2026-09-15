<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Services\Ai\AiException;
use App\Services\Ai\NanoGptClient;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\ComprasGovPrecoService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoService;
use Modules\Licita\Services\PesquisaPrecoIaService;
use Modules\Licita\Services\PesquisaPrecoService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

/**
 * Sugestão de cotações da Pesquisa de Preços via consulta ao Compras.gov.br
 * + saneamento estatístico + justificativa escrita por IA
 * (Modules\Licita\Services\PesquisaPrecoIaService).
 */
final class PesquisaPrecoIaTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: Tenant, 1: User}
     */
    private function setUpTenantEUsuario(): array
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);
        $elaborador = User::create(['name' => 'Elaborador', 'email' => 'elaborador@teste.gov.br', 'password' => bcrypt('secret')]);

        return [$tenant, $elaborador];
    }

    private function criarPesquisaPreco(User $elaborador): Processo
    {
        $processo = app(ProcessoService::class)->criar(['objeto' => 'Aquisição de equipamentos de TI.'], $elaborador);

        $dfd = app(DfdService::class)->criar($processo, [
            'data_previsao' => '2026-12-01',
            'grau_prioridade' => GrauPrioridade::Media->value,
            'justificativa' => 'Necessidade de equipamentos de TI.',
            'objeto' => 'Aquisição de equipamentos de TI.',
            'equipe_planejamento' => [
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
                ['nome' => 'Sicrana', 'cargo' => 'Gestora', 'matricula' => '002'],
            ],
            'itens' => [
                ['tipo' => 'material', 'codigo' => '482190', 'descricao' => 'Notebook', 'unidade_medida' => 'unidade', 'quantidade' => 10, 'valor_unitario' => 3000],
            ],
        ], $elaborador);
        $dfd = app(DfdService::class)->enviarParaRevisao($dfd, $elaborador);
        $aprovador = User::create(['name' => 'Aprovador', 'email' => 'aprovador@teste.gov.br', 'password' => bcrypt('secret')]);
        app(DfdService::class)->aprovar($dfd, $aprovador);

        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'ETP de teste.'], $elaborador);
        app(MapaRiscoService::class)->criar($processo->fresh(), ['riscos' => [
            ['descricao' => 'Risco de teste.', 'fase' => 'planejamento', 'probabilidade' => 2, 'impacto' => 2, 'alocacao' => 'contratante'],
        ]], $elaborador);
        app(PesquisaPrecoService::class)->criar($processo->fresh(), ['metodo_referencia' => 'mediana'], $elaborador);

        return $processo->fresh();
    }

    public function test_sugere_cotacoes_reais_e_estatisticas_a_partir_do_compras_gov(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarPesquisaPreco($elaborador);

        $this->mock(ComprasGovPrecoService::class, function ($mock) {
            $mock->shouldReceive('buscarPrecos')
                ->once()
                ->with('material', '482190')
                ->andReturn([
                    ['fornecedor' => 'Fornecedor A', 'cnpj_fornecedor' => '11111111000100', 'valor_unitario' => 3000.0, 'data_compra' => '2026-01-10', 'orgao' => 'Prefeitura X', 'uf' => 'PR', 'referencia' => 'Compras.gov.br — Compra 1'],
                    ['fornecedor' => 'Fornecedor B', 'cnpj_fornecedor' => '22222222000100', 'valor_unitario' => 3100.0, 'data_compra' => '2026-01-05', 'orgao' => 'Prefeitura Y', 'uf' => 'SC', 'referencia' => 'Compras.gov.br — Compra 2'],
                    ['fornecedor' => 'Fornecedor C', 'cnpj_fornecedor' => '33333333000100', 'valor_unitario' => 2950.0, 'data_compra' => '2026-01-08', 'orgao' => 'Prefeitura Z', 'uf' => 'RS', 'referencia' => 'Compras.gov.br — Compra 3'],
                ]);
        });

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->andReturn(['content' => 'Justificativa gerada pela IA.', 'model' => 'deepseek/deepseek-v4-pro-0813', 'usage' => []]);
        });

        $resultado = app(PesquisaPrecoIaService::class)->sugerirCotacoes($processo->fresh()->pesquisaPreco);

        self::assertCount(1, $resultado['itens']);
        self::assertSame('482190', $resultado['itens'][0]['codigo']);
        self::assertCount(3, $resultado['itens'][0]['cotacoes_sugeridas']);
        self::assertSame(3, $resultado['itens'][0]['estatisticas']['total_encontrado']);
        self::assertSame(0, $resultado['itens'][0]['estatisticas']['outliers_removidos']);
        self::assertSame('Justificativa gerada pela IA.', $resultado['justificativa_metodo_sugerida']);
    }

    public function test_item_sem_resultado_no_compras_gov_e_ignorado_sem_quebrar(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarPesquisaPreco($elaborador);

        $this->mock(ComprasGovPrecoService::class, function ($mock) {
            $mock->shouldReceive('buscarPrecos')->once()->andReturn([]);
        });
        $this->mock(NanoGptClient::class, function ($mock) {
            // Sem itens para resumir, não vale a pena chamar a IA — cai direto no template.
            $mock->shouldNotReceive('chatCompletion');
        });

        $resultado = app(PesquisaPrecoIaService::class)->sugerirCotacoes($processo->fresh()->pesquisaPreco);

        self::assertSame([], $resultado['itens']);
        self::assertStringContainsString('Nenhum resultado', $resultado['justificativa_metodo_sugerida']);
    }

    public function test_falha_da_ia_nao_derruba_a_sugestao_de_cotacoes_reais(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarPesquisaPreco($elaborador);

        $this->mock(ComprasGovPrecoService::class, function ($mock) {
            $mock->shouldReceive('buscarPrecos')->once()->andReturn([
                ['fornecedor' => 'Fornecedor A', 'cnpj_fornecedor' => null, 'valor_unitario' => 3000.0, 'data_compra' => '2026-01-10', 'orgao' => null, 'uf' => null, 'referencia' => 'ref-1'],
                ['fornecedor' => 'Fornecedor B', 'cnpj_fornecedor' => null, 'valor_unitario' => 3100.0, 'data_compra' => '2026-01-05', 'orgao' => null, 'uf' => null, 'referencia' => 'ref-2'],
                ['fornecedor' => 'Fornecedor C', 'cnpj_fornecedor' => null, 'valor_unitario' => 2950.0, 'data_compra' => '2026-01-08', 'orgao' => null, 'uf' => null, 'referencia' => 'ref-3'],
            ]);
        });
        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')->once()->andThrow(new AiException('IA indisponível.'));
        });

        $resultado = app(PesquisaPrecoIaService::class)->sugerirCotacoes($processo->fresh()->pesquisaPreco);

        self::assertCount(1, $resultado['itens']);
        self::assertCount(3, $resultado['itens'][0]['cotacoes_sugeridas']);
        self::assertStringContainsString('Compras.gov.br', $resultado['justificativa_metodo_sugerida']);
        self::assertStringContainsString('IN SEGES/ME nº 65/2021', $resultado['justificativa_metodo_sugerida']);
    }
}

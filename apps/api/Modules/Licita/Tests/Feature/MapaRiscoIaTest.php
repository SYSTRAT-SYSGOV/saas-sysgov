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
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Models\Processo;
use Modules\Licita\Services\CampoConfiguracaoService;
use Modules\Licita\Services\DfdService;
use Modules\Licita\Services\EtpService;
use Modules\Licita\Services\MapaRiscoIaService;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

/**
 * Geração de riscos por IA para o Mapa de Riscos
 * (Modules\Licita\Services\MapaRiscoIaService) — diferente das demais
 * funcionalidades de IA do Licita (texto rico livre), aqui a resposta
 * precisa ser um array JSON estruturado, normalizado contra os enums de
 * FaseRisco/AlocacaoRisco antes de chegar ao frontend.
 */
final class MapaRiscoIaTest extends TestCase
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

    private function criarProcessoComDfdEEtp(User $elaborador): Processo
    {
        $processo = app(ProcessoService::class)->criar(['objeto' => 'Contratação de empresa especializada em serviços de limpeza predial.'], $elaborador);

        $dfd = app(DfdService::class)->criar($processo, [
            'data_previsao' => '2026-12-01',
            'grau_prioridade' => GrauPrioridade::Media->value,
            'justificativa' => 'Necessidade de contratação de serviço continuado de limpeza.',
            'objeto' => 'Contratação de empresa especializada em serviços de limpeza predial.',
            'equipe_planejamento' => [
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
                ['nome' => 'Sicrana', 'cargo' => 'Gestora', 'matricula' => '002'],
            ],
        ], $elaborador);
        $dfd = app(DfdService::class)->enviarParaRevisao($dfd, $elaborador);
        $aprovador = User::create(['name' => 'Aprovador', 'email' => 'aprovador@teste.gov.br', 'password' => bcrypt('secret')]);
        app(DfdService::class)->aprovar($dfd, $aprovador);

        app(EtpService::class)->criar($processo->fresh(), ['conteudo' => 'Estudo técnico preliminar de limpeza predial.'], $elaborador);

        return $processo->fresh();
    }

    public function test_sugestao_de_riscos_inclui_legislacao_relevante_e_normaliza_a_resposta(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarProcessoComDfdEEtp($elaborador);

        LegalDocumento::create([
            'tenant_id' => null,
            'tipo' => 'lei',
            'numero' => '14.133/2021',
            'titulo' => 'Lei Geral de Licitações e Contratos Administrativos',
            'ementa' => 'Estabelece normas gerais de licitação e contratação para limpeza, obras e serviços.',
            'texto_completo' => 'Art. 22. O mapa de riscos... limpeza predial continuada...',
            'tags' => ['limpeza', 'licitacao'],
            'ativo' => true,
        ]);

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->withArgs(function (array $messages) {
                    $conteudoUsuario = $messages[1]['content'] ?? '';

                    return str_contains($conteudoUsuario, 'Contratação de empresa especializada em serviços de limpeza predial.')
                        && str_contains($conteudoUsuario, 'Lei Geral de Licitações e Contratos Administrativos')
                        && str_contains($conteudoUsuario, 'planejamento", "selecao_fornecedor", "gestao_contratual');
                })
                ->andReturn([
                    'content' => json_encode([
                        'riscos' => [
                            [
                                'descricao' => 'Atraso na entrega do serviço pelo fornecedor.',
                                'fase' => 'gestao_contratual',
                                'probabilidade' => 3,
                                'impacto' => 4,
                                'causa' => 'Fornecedor sem estrutura suficiente.',
                                'dano' => 'Descontinuidade da limpeza predial.',
                                'alocacao' => 'contratada',
                                'acao_preventiva' => 'Exigir comprovação de capacidade técnica na habilitação.',
                                'responsavel_prevencao' => 'Setor de Compras',
                                'acao_contingencia' => 'Acionar fornecedor reserva.',
                                'responsavel_contingencia' => 'Fiscal do Contrato',
                            ],
                            [
                                'descricao' => 'Risco com valores inválidos, deve ser normalizado.',
                                'fase' => 'fase_inexistente',
                                'probabilidade' => 99,
                                'impacto' => 0,
                                'causa' => null,
                                'dano' => null,
                                'alocacao' => 'alocacao_invalida',
                                'acao_preventiva' => null,
                                'responsavel_prevencao' => null,
                                'acao_contingencia' => null,
                                'responsavel_contingencia' => null,
                            ],
                        ],
                        'campos_extras' => [],
                    ]),
                    'model' => 'deepseek/deepseek-v4-pro-0813',
                    'usage' => [],
                ]);
        });

        $resultado = app(MapaRiscoIaService::class)->sugerirRiscos($processo);

        self::assertCount(2, $resultado['riscos']);
        self::assertSame('gestao_contratual', $resultado['riscos'][0]['fase']);
        self::assertSame('contratada', $resultado['riscos'][0]['alocacao']);
        self::assertSame('Setor de Compras', $resultado['riscos'][0]['responsavel_prevencao']);
        self::assertSame('Fiscal do Contrato', $resultado['riscos'][0]['responsavel_contingencia']);

        // Segundo risco: valores inválidos normalizados para os defaults seguros.
        self::assertSame('planejamento', $resultado['riscos'][1]['fase']);
        self::assertSame('compartilhado', $resultado['riscos'][1]['alocacao']);
        self::assertSame(5, $resultado['riscos'][1]['probabilidade']);
        self::assertSame(1, $resultado['riscos'][1]['impacto']);
        self::assertNull($resultado['riscos'][1]['responsavel_prevencao']);
        self::assertNull($resultado['riscos'][1]['responsavel_contingencia']);

        self::assertNotEmpty($resultado['legislacao_utilizada']);
        self::assertSame('Lei Geral de Licitações e Contratos Administrativos', $resultado['legislacao_utilizada'][0]['titulo']);
    }

    public function test_campos_extras_configurados_sao_sugeridos_e_normalizados(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarProcessoComDfdEEtp($elaborador);

        app(CampoConfiguracaoService::class)->salvar('mapa_riscos', [
            ['key' => 'observacao_geral', 'label' => 'Observação Geral', 'tipo' => 'texto', 'obrigatorio' => false, 'ordem' => 1],
            ['key' => 'analise_detalhada', 'label' => 'Análise Detalhada', 'tipo' => 'texto_longo', 'obrigatorio' => false, 'ordem' => 2],
            ['key' => 'orcamento_previsto', 'label' => 'Orçamento Previsto', 'tipo' => 'numero', 'obrigatorio' => false, 'ordem' => 3],
        ]);

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->withArgs(function (array $messages) {
                    $conteudoUsuario = $messages[1]['content'] ?? '';

                    return str_contains($conteudoUsuario, '"observacao_geral"')
                        && str_contains($conteudoUsuario, '"analise_detalhada"')
                        && !str_contains($conteudoUsuario, '"orcamento_previsto"');
                })
                ->andReturn([
                    'content' => json_encode([
                        'riscos' => [
                            ['descricao' => 'Risco de teste.', 'fase' => 'planejamento', 'probabilidade' => 2, 'impacto' => 2, 'alocacao' => 'contratante'],
                        ],
                        'campos_extras' => [
                            'observacao_geral' => 'Resumo curto sugerido pela IA.',
                            'analise_detalhada' => 'Texto longo sugerido pela IA, com mais de uma frase de análise.',
                            'orcamento_previsto' => '150000',
                            'campo_inexistente' => 'Não deve aparecer no resultado.',
                        ],
                    ]),
                    'model' => 'deepseek/deepseek-v4-pro-0813',
                    'usage' => [],
                ]);
        });

        $resultado = app(MapaRiscoIaService::class)->sugerirRiscos($processo);

        self::assertSame([
            'observacao_geral' => 'Resumo curto sugerido pela IA.',
            'analise_detalhada' => 'Texto longo sugerido pela IA, com mais de uma frase de análise.',
        ], $resultado['campos_extras']);
    }

    public function test_resposta_envolta_em_markdown_e_processada_normalmente(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarProcessoComDfdEEtp($elaborador);

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->andReturn([
                    'content' => "```json\n" . json_encode([
                        'riscos' => [
                            ['descricao' => 'Risco de teste.', 'fase' => 'planejamento', 'probabilidade' => 2, 'impacto' => 2, 'alocacao' => 'contratante'],
                        ],
                        'campos_extras' => [],
                    ]) . "\n```",
                    'model' => 'deepseek/deepseek-v4-pro-0813',
                    'usage' => [],
                ]);
        });

        $resultado = app(MapaRiscoIaService::class)->sugerirRiscos($processo);

        self::assertCount(1, $resultado['riscos']);
        self::assertSame('Risco de teste.', $resultado['riscos'][0]['descricao']);
    }

    public function test_resposta_sem_riscos_validos_lanca_ai_exception(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarProcessoComDfdEEtp($elaborador);

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->andReturn(['content' => json_encode(['riscos' => [], 'campos_extras' => []]), 'model' => 'deepseek/deepseek-v4-pro-0813', 'usage' => []]);
        });

        $this->expectException(AiException::class);
        app(MapaRiscoIaService::class)->sugerirRiscos($processo);
    }

    public function test_erro_do_provedor_de_ia_propaga_a_excecao_para_o_controller_tratar(): void
    {
        [, $elaborador] = $this->setUpTenantEUsuario();
        $processo = $this->criarProcessoComDfdEEtp($elaborador);

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->andThrow(new AiException('O suporte de IA está desativado nas configurações da plataforma.'));
        });

        $this->expectException(AiException::class);
        $this->expectExceptionMessage('O suporte de IA está desativado nas configurações da plataforma.');

        app(MapaRiscoIaService::class)->sugerirRiscos($processo);
    }
}

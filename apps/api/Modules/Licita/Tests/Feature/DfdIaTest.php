<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Services\Ai\AiException;
use App\Services\Ai\NanoGptClient;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Services\DfdIaService;
use Modules\Licita\Tests\TestCase;

/**
 * Sugestão de justificativa do DFD via IA (Modules\Licita\Services\DfdIaService)
 * — o requisito central é que a IA seja fundamentada na legislação REALMENTE
 * cadastrada na plataforma (global + do tenant), nunca "solta".
 */
final class DfdIaTest extends TestCase
{
    use RefreshDatabase;

    private function setUpTenant(): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        return $tenant;
    }

    public function test_sugestao_de_justificativa_inclui_a_legislacao_relevante_cadastrada_como_contexto(): void
    {
        $this->setUpTenant();

        LegalDocumento::create([
            'tenant_id' => null,
            'tipo' => 'lei',
            'numero' => '14.133/2021',
            'titulo' => 'Lei Geral de Licitações e Contratos Administrativos',
            'ementa' => 'Estabelece normas gerais de licitação e contratação para limpeza, obras e serviços.',
            'texto_completo' => 'Art. 18. O processo de contratação direta... limpeza predial continuada...',
            'tags' => ['limpeza', 'licitacao'],
            'ativo' => true,
        ]);

        LegalDocumento::create([
            'tenant_id' => null,
            'tipo' => 'decreto',
            'numero' => '99/2020',
            'titulo' => 'Decreto sobre merenda escolar',
            'ementa' => 'Normas sobre aquisição de gêneros alimentícios para merenda escolar.',
            'texto_completo' => 'Texto sobre merenda escolar e alimentação...',
            'tags' => ['merenda'],
            'ativo' => true,
        ]);

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->withArgs(function (array $messages) {
                    $conteudoUsuario = $messages[1]['content'] ?? '';

                    return str_contains($conteudoUsuario, 'Lei Geral de Licitações e Contratos Administrativos')
                        && !str_contains($conteudoUsuario, 'Decreto sobre merenda escolar');
                })
                ->andReturn([
                    'content' => 'Justificativa fundamentada na Lei 14.133/2021.',
                    'model' => 'deepseek/deepseek-v4-pro-0813',
                    'usage' => [],
                ]);
        });

        $resultado = app(DfdIaService::class)->sugerirJustificativa(
            'Contratação de empresa especializada em serviços de limpeza predial.',
            'Secretaria de Administração',
            [],
        );

        self::assertSame('<p>Justificativa fundamentada na Lei 14.133/2021.</p>', $resultado['justificativa']);
        self::assertNotEmpty($resultado['legislacao_utilizada']);
        self::assertSame('Lei Geral de Licitações e Contratos Administrativos', $resultado['legislacao_utilizada'][0]['titulo']);
    }

    public function test_com_texto_atual_pede_para_melhorar_em_vez_de_reescrever_do_zero(): void
    {
        $this->setUpTenant();

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->withArgs(function (array $messages) {
                    $conteudoUsuario = $messages[1]['content'] ?? '';

                    return str_contains($conteudoUsuario, 'MELHORAR esse texto')
                        && str_contains($conteudoUsuario, 'Texto ATUAL da justificativa (a melhorar):')
                        && str_contains($conteudoUsuario, 'Justificativa já existente sobre merenda escolar.')
                        // Não deve conter mais o enunciado de "escrever do zero".
                        && !str_contains($conteudoUsuario, 'Redija a JUSTIFICATIVA de um Documento');
                })
                ->andReturn(['content' => 'Justificativa expandida com mais um parágrafo.', 'model' => 'deepseek/deepseek-v4-pro-0813', 'usage' => []]);
        });

        $resultado = app(DfdIaService::class)->sugerirJustificativa(
            'Contratação de material de expediente.',
            null,
            [],
            '<p>Justificativa já existente sobre merenda escolar.</p>',
        );

        self::assertSame('<p>Justificativa expandida com mais um parágrafo.</p>', $resultado['justificativa']);
    }

    public function test_sem_documentos_legais_cadastrados_ainda_assim_gera_a_sugestao(): void
    {
        $this->setUpTenant();

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->andReturn(['content' => 'Justificativa genérica.', 'model' => 'deepseek/deepseek-v4-pro-0813', 'usage' => []]);
        });

        $resultado = app(DfdIaService::class)->sugerirJustificativa('Contratação de material de expediente.', null, []);

        self::assertSame('<p>Justificativa genérica.</p>', $resultado['justificativa']);
        self::assertSame([], $resultado['legislacao_utilizada']);
    }

    public function test_erro_do_provedor_de_ia_propaga_a_excecao_para_o_controller_tratar(): void
    {
        $this->setUpTenant();

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->andThrow(new AiException('O suporte de IA está desativado nas configurações da plataforma.'));
        });

        $this->expectException(AiException::class);
        $this->expectExceptionMessage('O suporte de IA está desativado nas configurações da plataforma.');

        app(DfdIaService::class)->sugerirJustificativa('Contratação de material de expediente.', null, []);
    }
}

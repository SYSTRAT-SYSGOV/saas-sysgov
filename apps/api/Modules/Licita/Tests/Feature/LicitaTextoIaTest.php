<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Tenant;
use App\Services\Ai\AiException;
use App\Services\Ai\NanoGptClient;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Licita\Models\LegalDocumento;
use Modules\Licita\Services\LicitaTextoIaService;
use Modules\Licita\Tests\TestCase;

/**
 * Sugestão de texto genérica para qualquer campo rico (TinyMCE) do Licita
 * (Modules\Licita\Services\LicitaTextoIaService) — usada por campos extras
 * configuráveis e pelo texto completo da legislação, entre outros. Mesma
 * regra da Justificativa do DFD: sempre fundamentada na legislação
 * cadastrada na plataforma.
 */
final class LicitaTextoIaTest extends TestCase
{
    use RefreshDatabase;

    private function setUpTenant(): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        return $tenant;
    }

    public function test_sugestao_generica_inclui_a_legislacao_relevante_como_contexto(): void
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

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->withArgs(function (array $messages) {
                    $conteudoUsuario = $messages[1]['content'] ?? '';

                    return str_contains($conteudoUsuario, 'Riscos de mercado')
                        && str_contains($conteudoUsuario, 'Lei Geral de Licitações e Contratos Administrativos');
                })
                ->andReturn(['content' => 'Texto sugerido para o campo.', 'model' => 'deepseek/deepseek-v4-pro-0813', 'usage' => []]);
        });

        $resultado = app(LicitaTextoIaService::class)->sugerirTexto(
            'Riscos de mercado',
            'Contratação de empresa especializada em serviços de limpeza predial.',
        );

        self::assertSame('<p>Texto sugerido para o campo.</p>', $resultado['texto']);
        self::assertNotEmpty($resultado['legislacao_utilizada']);
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
                        && str_contains($conteudoUsuario, 'Texto ATUAL do campo (a melhorar):')
                        && str_contains($conteudoUsuario, 'Conteúdo já existente.');
                })
                ->andReturn(['content' => 'Conteúdo expandido.', 'model' => 'deepseek/deepseek-v4-pro-0813', 'usage' => []]);
        });

        $resultado = app(LicitaTextoIaService::class)->sugerirTexto(
            'Campo qualquer',
            'contexto qualquer',
            '<p>Conteúdo já existente.</p>',
        );

        self::assertSame('<p>Conteúdo expandido.</p>', $resultado['texto']);
    }

    public function test_erro_do_provedor_de_ia_propaga_a_excecao(): void
    {
        $this->setUpTenant();

        $this->mock(NanoGptClient::class, function ($mock) {
            $mock->shouldReceive('chatCompletion')
                ->once()
                ->andThrow(new AiException('O suporte de IA está desativado nas configurações da plataforma.'));
        });

        $this->expectException(AiException::class);

        app(LicitaTextoIaService::class)->sugerirTexto('Campo qualquer', 'contexto qualquer');
    }
}

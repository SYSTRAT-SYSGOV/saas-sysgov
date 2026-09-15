<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Unit;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Modules\Licita\Services\ComprasGovPrecoService;
use Modules\Licita\Tests\TestCase;

final class ComprasGovPrecoServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_mapeia_registros_validos_do_endpoint_de_materiais(): void
    {
        Http::fake([
            'dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial*' => Http::response([
                'resultado' => [
                    ['precoUnitario' => 100.5, 'nomeFornecedor' => 'Fornecedor A', 'niFornecedor' => '11111111000100', 'dataCompra' => '2026-01-10', 'nomeOrgao' => 'Prefeitura X', 'estado' => 'PR', 'idCompra' => 123],
                    ['precoUnitario' => 0, 'nomeFornecedor' => 'Ignorado - preço zero'],
                    ['nomeFornecedor' => 'Ignorado - sem preço'],
                ],
            ], 200),
        ]);

        $resultado = (new ComprasGovPrecoService())->buscarPrecos('material', '482190');

        self::assertCount(1, $resultado);
        self::assertSame(100.5, $resultado[0]['valor_unitario']);
        self::assertSame('Fornecedor A', $resultado[0]['fornecedor']);
        self::assertStringContainsString('Compra 123', $resultado[0]['referencia']);
    }

    public function test_usa_endpoint_de_servicos_para_tipo_servico(): void
    {
        Http::fake([
            'dadosabertos.compras.gov.br/modulo-pesquisa-preco/3_consultarServico*' => Http::response([
                'resultado' => [['precoUnitario' => 8450.0, 'nomeFornecedor' => 'Empresa TI', 'estado' => 'SP']],
            ], 200),
        ]);

        $resultado = (new ComprasGovPrecoService())->buscarPrecos('servico', '27146');

        self::assertCount(1, $resultado);
        self::assertSame(8450.0, $resultado[0]['valor_unitario']);
    }

    public function test_resposta_de_erro_http_retorna_lista_vazia(): void
    {
        Http::fake([
            'dadosabertos.compras.gov.br/*' => Http::response('erro interno', 500),
        ]);

        self::assertSame([], (new ComprasGovPrecoService())->buscarPrecos('material', '482190'));
    }

    public function test_excecao_de_rede_retorna_lista_vazia(): void
    {
        Http::fake(function (): void {
            throw new \RuntimeException('timeout simulado');
        });

        self::assertSame([], (new ComprasGovPrecoService())->buscarPrecos('material', '482190'));
    }

    public function test_codigo_vazio_ou_tipo_invalido_nao_faz_requisicao(): void
    {
        Http::fake();

        self::assertSame([], (new ComprasGovPrecoService())->buscarPrecos('material', ''));
        self::assertSame([], (new ComprasGovPrecoService())->buscarPrecos('invalido', '482190'));
        Http::assertNothingSent();
    }
}

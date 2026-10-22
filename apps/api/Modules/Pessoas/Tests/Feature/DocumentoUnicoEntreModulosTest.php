<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use Modules\Campanha\Support\Documento as DocumentoCampanha;
use Modules\Inservivel\Support\Documento as DocumentoInservivel;
use Modules\Pessoas\Support\Documento;
use Tests\TestCase;

/** Spec pessoas: "Validação única de documento no cadastro central" — mesmo resultado em todos os módulos. */
final class DocumentoUnicoEntreModulosTest extends TestCase
{
    /** @return array<string, array{string}> */
    public static function documentos(): array
    {
        return [
            'cpf válido sem máscara' => ['52998224725'],
            'cpf válido com máscara' => ['529.982.247-25'],
            'cpf inválido' => ['529.982.247-26'],
            'cpf repetido' => ['111.111.111-11'],
            'cnpj válido' => ['11.222.333/0001-81'],
            'cnpj válido sem máscara' => ['11222333000181'],
            'cnpj inválido' => ['11.222.333/0001-82'],
            'tamanho errado' => ['12345'],
            'vazio' => [''],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('documentos')]
    public function test_resultado_identico_ao_do_cadastro_central(string $valor): void
    {
        $esperado = Documento::validoPorTamanho($valor);

        self::assertSame($esperado, DocumentoCampanha::valido($valor));
        self::assertSame(
            $esperado,
            DocumentoInservivel::cpfValido($valor) || DocumentoInservivel::cnpjValido($valor),
        );
    }

    public function test_formatacao_completa_do_cadastro_central(): void
    {
        self::assertSame('529.982.247-25', Documento::formatar('52998224725'));
        self::assertSame('11.222.333/0001-81', Documento::formatar('11222333000181'));
        self::assertSame('529.982.247-25', DocumentoCampanha::formatar('52998224725'));
        self::assertSame('11.222.333/0001-81', DocumentoInservivel::formatarCnpj('11222333000181'));
    }
}

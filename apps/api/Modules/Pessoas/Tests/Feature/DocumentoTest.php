<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use Modules\Pessoas\Support\Documento;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Validação de CPF e CNPJ, hash e máscara (spec: Validação matemática do CNPJ). */
final class DocumentoTest extends PessoasTestCase
{
    public function test_cpf_valido_e_aceito(): void
    {
        self::assertTrue(Documento::valido($this->cpfValido(), 'fisica'));
    }

    public function test_cpf_invalido_e_rejeitado(): void
    {
        self::assertFalse(Documento::valido('111.111.111-11', 'fisica'));
        self::assertFalse(Documento::valido('123.456.789-00', 'fisica'));
    }

    public function test_cnpj_valido_e_aceito(): void
    {
        self::assertTrue(Documento::valido($this->cnpjValido(), 'juridica'));
    }

    public function test_cnpj_invalido_e_rejeitado(): void
    {
        self::assertFalse(Documento::valido('11.111.111/1111-11', 'juridica'));
        self::assertFalse(Documento::valido('11.222.333/0001-00', 'juridica'));
    }

    public function test_mascara_cpf(): void
    {
        self::assertSame('***.456.789-**', Documento::mascarar('12345678900'));
    }

    public function test_mascara_cnpj(): void
    {
        self::assertSame('12.345.678/9012-34', Documento::mascarar('12345678901234'));
    }
}

<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\AtributosDinamicos\TipoAtributo;
use App\Support\AtributosDinamicos\ValidadorAtributo;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class AtributosDinamicosTest extends TestCase
{
    public function test_valida_numerico_com_sucesso(): void
    {
        self::assertSame(42, ValidadorAtributo::validar(TipoAtributo::NUMERICO, 42));
        self::assertSame(100, ValidadorAtributo::validar('numerico', '100'));
        self::assertSame(-5, ValidadorAtributo::validar(TipoAtributo::NUMERICO, '-5'));
    }

    public function test_rejeita_numerico_invalido(): void
    {
        $this->expectException(InvalidArgumentException::class);
        ValidadorAtributo::validar(TipoAtributo::NUMERICO, 'abc');
    }

    public function test_valida_texto(): void
    {
        self::assertSame('Texto curto', ValidadorAtributo::validar(TipoAtributo::TEXTO, 'Texto curto'));
    }

    public function test_rejeita_texto_maior_que_255(): void
    {
        $this->expectException(InvalidArgumentException::class);
        ValidadorAtributo::validar(TipoAtributo::TEXTO, str_repeat('a', 256));
    }

    public function test_valida_texto_longo(): void
    {
        $longo = str_repeat('Lorem ipsum ', 100);
        self::assertSame(trim($longo), ValidadorAtributo::validar(TipoAtributo::TEXTO_LONGO, $longo));
    }

    public function test_rejeita_texto_longo_acima_do_limite(): void
    {
        $this->expectException(InvalidArgumentException::class);
        ValidadorAtributo::validar(TipoAtributo::TEXTO_LONGO, str_repeat('a', 65536));
    }

    public function test_valida_lista(): void
    {
        self::assertSame('Opção A', ValidadorAtributo::validar(TipoAtributo::LISTA, 'Opção A'));
    }

    public function test_rejeita_lista_vazia_ou_nao_escalar(): void
    {
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::LISTA, ''));
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::LISTA, ['A', 'B']));
    }

    public function test_valida_lista_multipla(): void
    {
        self::assertSame(['A', 'B', 'C'], ValidadorAtributo::validar(TipoAtributo::LISTA_MULTIPLA, ['A', 'B', 'C']));
    }

    public function test_rejeita_lista_multipla_duplicada_ou_vazia(): void
    {
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::LISTA_MULTIPLA, []));
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::LISTA_MULTIPLA, ['A', 'A']));
    }

    public function test_valida_data_valida(): void
    {
        self::assertSame('2026-10-13', ValidadorAtributo::validar(TipoAtributo::DATA, '2026-10-13'));
    }

    public function test_rejeita_data_invalida_ou_fora_do_calendario(): void
    {
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::DATA, '31/02/2026'));
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::DATA, '2026-02-31'));
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::DATA, 'data-invalida'));
    }

    public function test_valida_decimal_como_string(): void
    {
        self::assertSame('1520.75', ValidadorAtributo::validar(TipoAtributo::DECIMAL, '1520.75'));
        self::assertSame('100', ValidadorAtributo::validar(TipoAtributo::DECIMAL, 100));
        self::assertSame('-12.345678', ValidadorAtributo::validar(TipoAtributo::DECIMAL, '-12.345678'));
    }

    public function test_rejeita_decimal_com_float_ou_formato_errado(): void
    {
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::DECIMAL, 1520.75));
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::DECIMAL, '12.1234567')); // mais de 6 casas
        self::assertFalse(ValidadorAtributo::ehValido(TipoAtributo::DECIMAL, 'abc'));
    }

    public function test_rejeita_tipo_desconhecido(): void
    {
        $this->expectException(InvalidArgumentException::class);
        ValidadorAtributo::validar('tipo_inexistente', 'valor');
    }
}

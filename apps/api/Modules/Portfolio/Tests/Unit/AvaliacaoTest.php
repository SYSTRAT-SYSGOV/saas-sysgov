<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Unit;

use Modules\Portfolio\Support\Avaliacao;
use PHPUnit\Framework\TestCase;

final class AvaliacaoTest extends TestCase
{
    public function test_converte_e_valida_uma_casa_decimal(): void
    {
        $this->assertSame(85, Avaliacao::paraDecimos('8.5'));
        $this->assertSame(100, Avaliacao::paraDecimos(10));
        $this->assertSame(8.5, Avaliacao::numero(85));
        $this->assertTrue(Avaliacao::valida('7.3'));
        $this->assertTrue(Avaliacao::valida(0));
        $this->assertFalse(Avaliacao::valida('7.25'));
        $this->assertFalse(Avaliacao::valida(10.5));
        $this->assertFalse(Avaliacao::valida(-1));
        $this->assertFalse(Avaliacao::valida('abc'));
    }

    public function test_media_arredonda_meio_para_cima_em_decimos(): void
    {
        $this->assertNull(Avaliacao::media([]));
        $this->assertSame(80, Avaliacao::media([80, 90, 70]));
        $this->assertSame(75, Avaliacao::media([70, 80]));
        $this->assertSame(77, Avaliacao::media([70, 80, 80])); // 7,666… → 7,7
    }
}

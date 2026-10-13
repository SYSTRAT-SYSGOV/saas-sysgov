<?php

declare(strict_types=1);

namespace Modules\Formatura\Tests\Unit;

use Modules\Formatura\Domain\CalculadoraValorDevido;
use Modules\Formatura\Enums\SituacaoFinanceira;
use Modules\Formatura\Enums\TipoCalculo;
use PHPUnit\Framework\TestCase;

/** Tarefa 4.3 — regra única do valor devido (spec formatura › Participação dos formandos). */
final class CalculadoraValorDevidoTest extends TestCase
{
    public function test_por_pessoa(): void
    {
        $this->assertSame(60000, CalculadoraValorDevido::calcular(TipoCalculo::PorPessoa, 15000, 0, true, 3)->cents);
    }

    public function test_fixo_mais_convidados(): void
    {
        // O valor fixo cobre só o formando: todos os convidados pagam o valor por convidado (D16).
        $this->assertSame(74000, CalculadoraValorDevido::calcular(TipoCalculo::FixoMaisConvidados, 50000, 8000, true, 3)->cents);
        $this->assertSame(50000, CalculadoraValorDevido::calcular(TipoCalculo::FixoMaisConvidados, 50000, 8000, true, 0)->cents);
    }

    public function test_quem_nao_participa_nao_deve_nada(): void
    {
        $this->assertSame(0, CalculadoraValorDevido::calcular(TipoCalculo::PorPessoa, 15000, 0, false, 5)->cents);
    }

    public function test_situacao_financeira(): void
    {
        $this->assertSame(SituacaoFinanceira::Parcial, SituacaoFinanceira::de(60000, 20000));
        $this->assertSame(SituacaoFinanceira::Quitado, SituacaoFinanceira::de(60000, 60000));
        $this->assertSame(SituacaoFinanceira::Pendente, SituacaoFinanceira::de(60000, 0));
        $this->assertSame(SituacaoFinanceira::Pendente, SituacaoFinanceira::de(0, 0));
    }
}

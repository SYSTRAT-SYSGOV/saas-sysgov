<?php

declare(strict_types=1);

namespace Modules\Formatura\Domain;

use App\Support\Money;
use Modules\Formatura\Enums\TipoCalculo;

/**
 * Valor devido por um formando, sempre em centavos inteiros (design D7). Regra única do servidor —
 * substitui os cálculos divergentes do frontend antigo (valor fixo no código, base de 1 ou 2 pessoas).
 *
 *  por_pessoa            = valor por pessoa × (1 + convidados)
 *  fixo_mais_convidados  = valor fixo (só o formando) + convidados × valor por convidado   (D16)
 *  não participa         = 0
 */
final class CalculadoraValorDevido
{
    public static function calcular(
        TipoCalculo $tipo,
        int $valorBaseCentavos,
        int $valorPessoaExtraCentavos,
        bool $participa,
        int $convidados,
    ): Money {
        if (!$participa) {
            return new Money(0);
        }

        $centavos = match ($tipo) {
            TipoCalculo::PorPessoa => $valorBaseCentavos * (1 + $convidados),
            TipoCalculo::FixoMaisConvidados => $valorBaseCentavos + $convidados * $valorPessoaExtraCentavos,
        };

        return new Money($centavos);
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cursos\Support;

/** Validação de dígito verificador de CPF — cadastro externo (design D6/D10), documento opcional. */
final class Cpf
{
    public static function valido(string $valor): bool
    {
        $d = (string) preg_replace('/\D/', '', $valor);

        if (strlen($d) !== 11 || preg_match('/^(\d)\1{10}$/', $d)) {
            return false;
        }

        for ($t = 9; $t < 11; $t++) {
            $soma = 0;
            for ($i = 0; $i < $t; $i++) {
                $soma += (int) $d[$i] * (($t + 1) - $i);
            }
            if ((int) $d[$t] !== ((10 * $soma) % 11) % 10) {
                return false;
            }
        }

        return true;
    }
}

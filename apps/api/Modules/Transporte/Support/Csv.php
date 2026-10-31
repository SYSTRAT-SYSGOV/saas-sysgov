<?php

declare(strict_types=1);

namespace Modules\Transporte\Support;

/** CSV em UTF-8 com BOM e `;`, com neutralização de fórmula (planilha) nas células de texto. */
final class Csv
{
    public const BOM = "\xEF\xBB\xBF";

    /** Células de texto iniciadas por `=`, `+`, `-`, `@`, tab ou CR recebem um apóstrofo à frente. */
    public static function neutralizar(string $texto): string
    {
        return $texto !== '' && str_contains("=+-@\t\r", $texto[0]) ? "'" . $texto : $texto;
    }

    /** @param list<string|int|float|null> $celulas */
    public static function linha(array $celulas): string
    {
        $saida = [];
        foreach ($celulas as $celula) {
            if ($celula === null || $celula === '') {
                $saida[] = '';
                continue;
            }
            $texto = is_string($celula) ? self::neutralizar($celula) : (string) $celula;
            $saida[] = preg_match('/[;"\r\n]/', $texto) === 1 ? '"' . str_replace('"', '""', $texto) . '"' : $texto;
        }

        return implode(';', $saida) . "\r\n";
    }
}

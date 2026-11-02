<?php

declare(strict_types=1);

namespace Modules\Transporte\Censo\Importacao;

use DateTime;
use Modules\Pessoas\Support\Documento;

/** Converte o texto de uma coluna conforme o tipo do campo, aponta valor incoerente e mascara dado sensível. */
final class ConversorCampo
{
    /** Valor pronto para uso; `null` quando vazio ou incoerente com o tipo. */
    public static function converter(CampoImportacao $campo, string $bruto): ?string
    {
        if ($bruto === '') {
            return null;
        }

        return match ($campo->tipo) {
            'data' => self::data($bruto, $campo->formato),
            'numero' => preg_match('/^-?\d+([.,]\d+)?$/', $bruto) === 1 ? str_replace(',', '.', $bruto) : null,
            'booleano' => $bruto === $campo->valorVerdadeiro ? '1' : '0',
            'codigo' => $campo->mapa[$bruto] ?? $bruto,
            default => $bruto,
        };
    }

    /** Motivo pelo qual um valor preenchido não bate com o tipo do campo, ou `null` se está coerente. */
    public static function problema(CampoImportacao $campo, string $bruto): ?string
    {
        if ($bruto === '') {
            return null;
        }

        return match ($campo->tipo) {
            'data' => self::data($bruto, $campo->formato) === null ? "não é uma data no formato {$campo->formato}" : null,
            'numero' => preg_match('/^-?\d+([.,]\d+)?$/', $bruto) === 1 ? null : 'não é um número',
            'codigo' => $campo->mapa !== null && !isset($campo->mapa[$bruto]) ? 'código fora do mapa do leiaute' : null,
            default => null,
        };
    }

    public static function mascarar(CampoImportacao $campo, string $bruto): string
    {
        if (!$campo->sensivel || $bruto === '') {
            return $bruto;
        }
        $digitos = Documento::somenteDigitos($bruto);
        if ($campo->destino === 'aluno.cpf' || (strlen($digitos) === 11 && $campo->tipo !== 'data')) {
            return '***.***.***-' . substr($digitos, -2);
        }
        if ($campo->tipo === 'data') {
            return str_repeat('*', max(0, strlen($bruto) - 4)) . substr($bruto, -4);
        }

        return mb_substr($bruto, 0, 1) . '***';
    }

    private static function data(string $bruto, string $formato): ?string
    {
        $data = DateTime::createFromFormat('!' . $formato, $bruto);
        if ($data === false || $data->format($formato) !== $bruto) {
            return null;
        }

        return $data->format('Y-m-d');
    }
}

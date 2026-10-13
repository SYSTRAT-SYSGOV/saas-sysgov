<?php

declare(strict_types=1);

namespace Modules\Escola\Enums;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Situação de um período letivo (trimestre) calculada pela data atual.
 * "arquivo" = período de um ano letivo diferente do ano corrente.
 */
enum SituacaoPeriodo: string
{
    case Agendado = 'agendado';
    case EmAndamento = 'em_andamento';
    case Encerrado = 'encerrado';
    case Arquivo = 'arquivo';

    public static function calcular(int $anoLetivo, CarbonInterface $inicio, CarbonInterface $fim, ?CarbonInterface $hoje = null): self
    {
        $hoje = ($hoje ?? Carbon::now())->copy()->startOfDay();

        return match (true) {
            $anoLetivo !== (int) $hoje->year => self::Arquivo,
            $hoje->lt($inicio->copy()->startOfDay()) => self::Agendado,
            $hoje->lte($fim->copy()->startOfDay()) => self::EmAndamento,
            default => self::Encerrado,
        };
    }
}

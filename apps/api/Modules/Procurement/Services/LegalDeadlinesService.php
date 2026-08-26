<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use Carbon\Carbon;
use Modules\Procurement\Models\Licitacao;

final class LegalDeadlinesService
{
    /**
     * Calcula o prazo mínimo legal de abertura do edital conforme Art. 55 da Lei 14.133/2021 (RN-017)
     */
    public function calculateMinimumOpeningDate(Licitacao $licitacao, ?Carbon $publicationDate = null): array
    {
        $pubDate = $publicationDate ?? now();
        $businessDaysRequired = $this->getRequiredBusinessDays($licitacao->modalidade, $licitacao->criterio_julgamento);

        $calculatedDate = $pubDate->copy();
        $addedDays = 0;

        // Contagem em dias úteis (desconsidera sábados e domingos)
        while ($addedDays < $businessDaysRequired) {
            $calculatedDate->addDay();
            if (!$calculatedDate->isWeekend()) {
                $addedDays++;
            }
        }

        // Definir horário padrão de abertura às 09:00
        $calculatedDate->setTime(9, 0, 0);

        return [
            'modalidade' => $licitacao->modalidade,
            'criterio_julgamento' => $licitacao->criterio_julgamento,
            'dias_uteis_obrigatorios' => $businessDaysRequired,
            'data_publicacao' => $pubDate->toDateString(),
            'data_minima_abertura' => $calculatedDate->toIso8601String(),
            'fundamento_legal' => 'Art. 55 da Lei nº 14.133/2021',
        ];
    }

    /**
     * Retorna a quantidade de dias úteis exigidos por lei
     */
    private function getRequiredBusinessDays(string $modalidade, string $criterio): int
    {
        return match ($modalidade) {
            'pregao_eletronico' => match ($criterio) {
                'menor_preco', 'maior_desconto' => 8,
                default => 10,
            },
            'concorrencia' => match ($criterio) {
                'menor_preco', 'maior_desconto' => 10,
                'melhor_tecnica', 'tecnica_e_preco' => 35,
                default => 15,
            },
            'leilao' => 15,
            'dialogo_competitivo' => 25,
            'concurso' => 35,
            'dispensa_eletronica' => 3,
            default => 8,
        };
    }
}

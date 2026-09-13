<?php

namespace Modules\Capd\Services;

use Modules\Capd\Exceptions\TravaIncidenteCriticoException;
use Modules\Capd\Models\DiarioBordo;

/**
 * Trava Eletrônica Antileniência e Antiprecipitação (spec §3.7).
 *
 * Regra: Grau 1, 2 ou 5 em fator qualitativo (F3–F6, F8) exige
 * ao menos 1 incidente crítico com evidência documental (hash_sha256 não nulo)
 * no Diário de Bordo do servidor no ciclo vigente.
 *
 * A validação ocorre:
 *   1. No backend (aqui) — bloqueante, lança exceção 422.
 *   2. No frontend — visual, para UX imediata (não substitui o backend).
 */
class TravaElectronicaService
{
    /**
     * Valida a presença de incidente crítico para graus extremos.
     *
     * @throws TravaIncidenteCriticoException  HTTP 422 no controller
     */
    public function validar(
        string $fatorCodigo,
        int    $cicloId,
        int    $servidorId,
        int    $fatorId,
    ): void {
        $possuiCit = DiarioBordo::query()
            ->paraServidor($servidorId)
            ->noCiclo($cicloId)
            ->paraFator($fatorId)
            ->comEvidencia()
            ->exists();

        if (! $possuiCit) {
            throw new TravaIncidenteCriticoException(
                fator: $fatorCodigo,
                mensagem: "A atribuição dos Graus 1, 2 ou 5 para o fator {$fatorCodigo} " .
                          "exige obrigatoriamente o registro prévio de ao menos 1 (um) " .
                          "Incidente Crítico (CIT) no Diário de Bordo, com evidência " .
                          "documental anexada (PDF, PNG ou JPG). " .
                          "Nenhum registro conforme foi encontrado para este servidor neste ciclo.",
            );
        }
    }

    /**
     * Verifica sem lançar exceção (usado para exibir avisos no frontend).
     */
    public function verificar(
        int $cicloId,
        int $servidorId,
        int $fatorId,
    ): bool {
        return DiarioBordo::query()
            ->paraServidor($servidorId)
            ->noCiclo($cicloId)
            ->paraFator($fatorId)
            ->comEvidencia()
            ->exists();
    }
}

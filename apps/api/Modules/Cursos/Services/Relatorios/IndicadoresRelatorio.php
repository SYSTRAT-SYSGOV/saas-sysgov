<?php

declare(strict_types=1);

namespace Modules\Cursos\Services\Relatorios;

/**
 * Cálculo único dos indicadores de relatório (design D2 dos relatórios do Cursos): usado por
 * todos os relatórios para que os números nunca discordem entre si nem da lista de inscritos.
 */
final class IndicadoresRelatorio
{
    /**
     * Situações da inscrição que entram na base de cálculo de qualquer relatório: as demais
     * (`pendente`, `lista_espera`, `cancelada`) só aparecem na contagem por situação.
     */
    public const array STATUS_BASE = ['confirmada', 'concluida', 'nao_concluida'];

    /**
     * `concluida ÷ (concluida + nao_concluida)`, em percentual com duas casas. Nulo quando não
     * há nenhuma das duas (turma ainda aberta, ou sem inscrições na base).
     */
    public function taxaConclusao(int $concluidas, int $naoConcluidas): ?float
    {
        $base = $concluidas + $naoConcluidas;
        if ($base === 0) {
            return null;
        }

        return round($concluidas / $base * 100, 2);
    }

    /**
     * Média simples com duas casas. Nula (não zero) quando não há nenhum valor — ex.: nota
     * média de um curso sem avaliação publicada e liberada.
     */
    public function media(?float $soma, int $quantidadeComValor): ?float
    {
        if ($soma === null || $quantidadeComValor === 0) {
            return null;
        }

        return round($soma / $quantidadeComValor, 2);
    }

    /**
     * Horas certificadas de um curso: a carga horária multiplicada pelo número de inscrições
     * `concluida` cujo certificado foi emitido e não foi revogado.
     */
    public function horasCertificadasMinutos(int $cargaHorariaMinutos, int $concluidosComCertificado): int
    {
        return $cargaHorariaMinutos * $concluidosComCertificado;
    }
}

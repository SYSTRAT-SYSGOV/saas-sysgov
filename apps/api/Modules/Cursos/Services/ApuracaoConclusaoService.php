<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Models\Inscricao;

/**
 * Critério de conclusão (design D4 da Fase 1, estendido no D9 da Fase 2): a
 * frequência mínima do curso e, quando o curso tem nota mínima
 * (cursos_cursos.nota_minima), a nota final nas avaliações. Quem chama não muda.
 */
final class ApuracaoConclusaoService
{
    public function __construct(
        private readonly FrequenciaService $frequencia,
        private readonly NotaService $notas,
    ) {}

    /**
     * `nota` é a nota final nas avaliações publicadas, ou nula se o curso não tem
     * nenhuma. Só decide a conclusão quando o curso tem nota mínima.
     *
     * @return array{concluiu: bool, frequencia: float, nota: float|null}
     */
    public function apurar(Inscricao $inscricao): array
    {
        $resumo = $this->frequencia->resumo($inscricao);
        $curso = $inscricao->turma->curso;
        $nota = $this->notas->notaFinal($inscricao);

        $atingiuFrequencia = $resumo['aulas'] > 0 && $resumo['percentual'] >= $curso->frequencia_minima;
        // Compara em centésimos: a nota já vem arredondada em 2 casas, como a pessoa lê na tela.
        $atingiuNota = $curso->nota_minima === null
            || (int) round(($nota ?? 0.0) * 100) >= (int) round(((float) $curso->nota_minima) * 100);

        return [
            'concluiu' => $atingiuFrequencia && $atingiuNota,
            'frequencia' => $resumo['percentual'],
            'nota' => $nota,
        ];
    }
}

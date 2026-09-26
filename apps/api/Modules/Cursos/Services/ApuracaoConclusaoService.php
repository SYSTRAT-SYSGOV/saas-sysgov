<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Models\Inscricao;

/**
 * Critério de conclusão (design D4). Nesta fase só a frequência mínima do
 * curso; a Fase 2 acrescenta aqui a nota mínima nas avaliações
 * (cursos_cursos.nota_minima) sem mudar quem chama.
 */
final class ApuracaoConclusaoService
{
    public function __construct(
        private readonly FrequenciaService $frequencia,
    ) {}

    /**
     * @return array{concluiu: bool, frequencia: float}
     */
    public function apurar(Inscricao $inscricao): array
    {
        $resumo = $this->frequencia->resumo($inscricao);
        $minima = $inscricao->turma->curso->frequencia_minima;

        return [
            'concluiu' => $resumo['aulas'] > 0 && $resumo['percentual'] >= $minima,
            'frequencia' => $resumo['percentual'],
        ];
    }
}

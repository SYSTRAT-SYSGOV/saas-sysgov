<?php

declare(strict_types=1);

namespace Modules\Cursos\Services;

use Modules\Cursos\Enums\StatusTentativa;
use Modules\Cursos\Enums\StatusTurma;
use Modules\Cursos\Models\Avaliacao;
use Modules\Cursos\Models\Inscricao;
use Modules\Cursos\Models\Tentativa;

/**
 * Nota final da inscrição (Fase 2, design D9): média ponderada, pelo peso, da
 * maior nota entre as tentativas corrigidas em cada avaliação publicada do
 * curso. Avaliação sem tentativa corrigida conta como zero.
 */
final class NotaService
{
    /**
     * Nota calculada agora, ou nula quando o curso não tem avaliação publicada.
     * Enquanto a turma está aberta é a nota parcial; no encerramento vira a nota apurada.
     */
    public function notaFinal(Inscricao $inscricao): ?float
    {
        $avaliacoes = Avaliacao::query()
            ->where('curso_id', $inscricao->turma->curso_id)
            ->where('publicada', true)
            ->get(['id', 'peso']);
        if ($avaliacoes->isEmpty()) {
            return null;
        }

        /** @var array<int, string|float|int|null> $melhores */
        $melhores = Tentativa::query()
            ->where('inscricao_id', $inscricao->id)
            ->where('status', StatusTentativa::Corrigida->value)
            ->whereIn('avaliacao_id', $avaliacoes->pluck('id'))
            ->selectRaw('avaliacao_id, MAX(nota) as melhor')
            ->groupBy('avaliacao_id')
            ->pluck('melhor', 'avaliacao_id')
            ->all();

        // Em centésimos, para somar sem erro de ponto flutuante.
        $pesos = 0;
        $ponderado = 0;
        foreach ($avaliacoes as $avaliacao) {
            $peso = (int) $avaliacao->peso;
            $pesos += $peso;
            $ponderado += $peso * (int) round(((float) ($melhores[$avaliacao->id] ?? 0)) * 100);
        }

        return round($ponderado / $pesos / 100, 2);
    }

    /**
     * Nota mostrada ao participante e ao instrutor: a apurada no encerramento
     * (que não muda mais) ou, com a turma aberta, a parcial.
     */
    public function exibida(Inscricao $inscricao): ?float
    {
        if ($inscricao->turma->statusEnum()->is(StatusTurma::Encerrada)) {
            return $inscricao->nota_apurada !== null ? (float) $inscricao->nota_apurada : null;
        }

        return $this->notaFinal($inscricao);
    }
}

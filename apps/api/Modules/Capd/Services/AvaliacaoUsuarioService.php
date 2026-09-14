<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use Modules\Capd\Models\AvaliacaoUsuario;

/**
 * Coleta e agregação da Avaliação pelo Usuário Externo (art. 25) — RF-06.
 *
 * Composição do Fator H. Não altera automaticamente o cálculo da nota do
 * ciclo — a média agregada fica disponível para consulta do avaliador.
 */
final class AvaliacaoUsuarioService
{
    public function registrar(int $servidorId, int $cicloId, float $notaAtendimento, ?string $comentario = null, ?string $identificador = null): AvaliacaoUsuario
    {
        return AvaliacaoUsuario::create([
            'servidor_id'              => $servidorId,
            'ciclo_id'                 => $cicloId,
            'nota_atendimento'         => number_format($notaAtendimento, 2, '.', ''),
            'comentario'               => $comentario,
            'avaliador_identificador'  => $identificador,
        ]);
    }

    /**
     * @return array{media: string|null, total_avaliacoes: int}
     */
    public function mediaPorServidorCiclo(int $servidorId, int $cicloId): array
    {
        $avaliacoes = AvaliacaoUsuario::query()
            ->where('servidor_id', $servidorId)
            ->where('ciclo_id', $cicloId)
            ->get();

        if ($avaliacoes->isEmpty()) {
            return ['media' => null, 'total_avaliacoes' => 0];
        }

        $soma = $avaliacoes->reduce(fn (float $carry, AvaliacaoUsuario $a) => $carry + (float) $a->nota_atendimento, 0.0);

        return [
            'media'            => number_format($soma / $avaliacoes->count(), 2, '.', ''),
            'total_avaliacoes' => $avaliacoes->count(),
        ];
    }
}

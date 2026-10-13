<?php

declare(strict_types=1);

namespace Modules\Portfolio\Services;

use Modules\Portfolio\Models\Trabalho;
use Modules\Portfolio\Support\Avaliacao;

/** Totais e médias do aluno no período (médias em décimos, meio para cima, devolvidas com uma casa). */
final class DesempenhoService
{
    /**
     * @param iterable<Trabalho> $trabalhos
     * @return array{total: int, media: float|null, por_materia: list<array{materia_id: int, materia: string|null, quantidade: int, media: float|null}>, por_trimestre: list<array{trimestre: int, quantidade: int, media: float|null}>|null}
     */
    public function calcular(iterable $trabalhos, bool $anoTodo): array
    {
        $lista = collect($trabalhos);
        $media = fn ($grupo): ?float => ($m = Avaliacao::media($grupo->pluck('avaliacao_decimos')->all())) !== null ? Avaliacao::numero($m) : null;

        $porMateria = $lista->groupBy('materia_id')->map(fn ($grupo, $materiaId): array => [
            'materia_id' => (int) $materiaId,
            'materia' => $grupo->first()->materia?->nome,
            'quantidade' => $grupo->count(),
            'media' => $media($grupo),
        ])->sortBy('materia')->values()->all();

        $porTrimestre = $anoTodo ? array_map(function (int $n) use ($lista, $media): array {
            $grupo = $lista->where('trimestre', $n);

            return ['trimestre' => $n, 'quantidade' => $grupo->count(), 'media' => $media($grupo)];
        }, [1, 2, 3]) : null;

        return ['total' => $lista->count(), 'media' => $media($lista), 'por_materia' => $porMateria, 'por_trimestre' => $porTrimestre];
    }
}

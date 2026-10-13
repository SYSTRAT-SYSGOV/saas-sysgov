<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Escola\Models\Turma;

/** @mixin Turma */
final class TurmaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'ano_letivo' => $this->ano_letivo,
            'turno' => $this->whenLoaded('turno', fn () => $this->turno === null ? null : ['id' => $this->turno->id, 'nome' => $this->turno->nome]),
            'pedagoga' => $this->whenLoaded('pedagoga', fn () => $this->pedagoga === null ? null : ['id' => $this->pedagoga->id, 'nome' => $this->pedagoga->nome]),
            'total_alunos' => $this->whenCounted('alunos'),
            'materias' => $this->whenLoaded('vinculos', fn () => $this->vinculos->map(fn ($v): array => [
                'materia_id' => $v->materia_id,
                'materia' => $v->relationLoaded('materia') ? $v->materia?->nome : null,
                'professor_user_id' => $v->professor_user_id,
                'professor' => $v->relationLoaded('professor') ? $v->professor?->name : null,
            ])->all()),
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Escola\Models\Materia;

/** @mixin Materia */
final class MateriaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'turmas' => $this->whenLoaded('vinculos', fn () => $this->vinculos
                ->filter(fn ($v): bool => $v->turma !== null)
                ->map(fn ($v): array => ['id' => $v->turma_id, 'nome' => $v->turma->nome])
                ->values()
                ->all()),
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Pessoas\Models\PessoaSocio;

/**
 * @mixin PessoaSocio
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class PessoaSocioResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pessoa_id' => $this->pessoa_id,
            'socio_pessoa_id' => $this->socio_pessoa_id,
            'socio_nome' => $this->whenLoaded('socio', fn () => $this->socio?->nome),
            'socio_documento_mascarado' => $this->whenLoaded('socio', fn () => $this->socio?->documento_mascarado),
            'percentual_participacao' => $this->percentual_participacao,
            'papel' => $this->papel,
            'data_entrada' => $this->data_entrada?->format('Y-m-d'),
            'data_saida' => $this->data_saida?->format('Y-m-d'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

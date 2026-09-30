<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Pessoas\Models\PessoaVinculo;

/**
 * @mixin PessoaVinculo
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class PessoaVinculoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pessoa_id' => $this->pessoa_id,
            'tipo_vinculo' => $this->tipo_vinculo,
            'matricula' => $this->matricula,
            'dados' => $this->dados,
            'inicio' => $this->inicio?->format('Y-m-d'),
            'fim' => $this->fim?->format('Y-m-d'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

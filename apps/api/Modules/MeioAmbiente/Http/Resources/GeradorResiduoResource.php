<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\GeradorResiduo;

/** @mixin GeradorResiduo */
final class GeradorResiduoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'tipo' => $this->tipo,
            'pessoa_id' => $this->pessoa_id,
            'empreendimento_id' => $this->empreendimento_id,
            'total_coletado_kg' => (float) $this->coletas()->sum('volume_kg'),
        ];
    }
}

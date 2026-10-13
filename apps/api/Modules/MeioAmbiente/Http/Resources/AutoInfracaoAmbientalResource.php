<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;

/**
 * @mixin AutoInfracaoAmbiental
 * @property \Illuminate\Support\Carbon|null $created_at
 */
final class AutoInfracaoAmbientalResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'documento_id' => $this->documento_id,
            'documento_numero' => $this->whenLoaded('documento', fn () => $this->documento->numero),
            'empreendimento_id' => $this->empreendimento_id,
            'tipo_infracao' => $this->tipo_infracao,
            'area_afetada_ha' => $this->area_afetada_ha !== null ? (float) $this->area_afetada_ha : null,
            'reincidente' => $this->reincidente,
            'valor_multa_sugerido_centavos' => $this->valor_multa_sugerido_centavos,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

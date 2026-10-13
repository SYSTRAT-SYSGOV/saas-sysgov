<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\OcorrenciaQueimada;

/** @mixin OcorrenciaQueimada */
final class OcorrenciaQueimadaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'data_ocorrencia' => $this->data_ocorrencia->toDateString(),
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'area_queimada_ha' => $this->area_queimada_ha !== null ? (float) $this->area_queimada_ha : null,
            'responsavel_pessoa_id' => $this->responsavel_pessoa_id,
            'responsavel_empreendimento_id' => $this->responsavel_empreendimento_id,
            'auto_infracao_ambiental_id' => $this->auto_infracao_ambiental_id,
            'situacao' => $this->situacao,
            'referencia_imagem_satelite' => $this->referencia_imagem_satelite,
        ];
    }
}

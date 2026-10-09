<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\OutorgaAgua;

/** @mixin OutorgaAgua */
final class OutorgaAguaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empreendimento_id' => $this->empreendimento_id,
            'tipo_captacao' => $this->tipo_captacao,
            'vazao_m3_hora' => (float) $this->vazao_m3_hora,
            'finalidade' => $this->finalidade,
            'validade_em' => $this->validade_em->toDateString(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\LicencaLancamentoEfluente;

/** @mixin LicencaLancamentoEfluente */
final class LicencaLancamentoEfluenteResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empreendimento_id' => $this->empreendimento_id,
            'validade_em' => $this->validade_em->toDateString(),
            'tem_nao_conformidade' => $this->temNaoConformidade(),
            'parametros' => $this->whenLoaded('parametros', fn () => $this->parametros->map(fn ($p) => [
                'id' => $p->id,
                'parametro' => $p->parametro,
                'limite_min' => $p->limite_min !== null ? (float) $p->limite_min : null,
                'limite_max' => $p->limite_max !== null ? (float) $p->limite_max : null,
                'unidade' => $p->unidade,
            ])->values()->all()),
        ];
    }
}

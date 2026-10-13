<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\AreaProtegida;

/** @mixin AreaProtegida */
final class AreaProtegidaResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tipo' => $this->tipo,
            'subtipo' => $this->subtipo,
            'geometria' => $this->geometria,
            'ato_legal' => $this->ato_legal,
        ];
    }
}

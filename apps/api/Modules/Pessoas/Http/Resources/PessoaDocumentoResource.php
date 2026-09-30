<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Pessoas\Models\PessoaDocumento;

/**
 * @mixin PessoaDocumento
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class PessoaDocumentoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pessoa_id' => $this->pessoa_id,
            'tipo' => $this->tipo,
            'numero' => $this->numero,
            'orgao_emissor' => $this->orgao_emissor,
            'uf_emissao' => $this->uf_emissao,
            'data_emissao' => $this->data_emissao?->format('Y-m-d'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

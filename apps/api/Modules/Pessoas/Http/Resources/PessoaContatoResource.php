<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\Pessoas\Models\PessoaContato;

/**
 * @mixin PessoaContato
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class PessoaContatoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pessoa_id' => $this->pessoa_id,
            'tipo' => $this->tipo,
            'valor' => $this->valor,
            'principal' => (bool) $this->principal,
            'autoriza_notificacoes' => (bool) $this->autoriza_notificacoes,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\Empreendimento;

/**
 * @mixin Empreendimento
 * @property \Illuminate\Support\Carbon|null $created_at
 */
final class EmpreendimentoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'titular_pessoa_id' => $this->titular_pessoa_id,
            'titular_nome' => $this->whenLoaded('titular', fn () => $this->titular?->nome),
            'cnpj' => $this->cnpj,
            'razao_social' => $this->razao_social,
            'atividade' => $this->atividade,
            'porte' => $this->porte,
            'impacto_significativo' => $this->impacto_significativo,
            'valor_empreendimento_centavos' => $this->valor_empreendimento_centavos,
            'latitude' => (float) $this->latitude,
            'longitude' => (float) $this->longitude,
            'responsavel_tecnico' => $this->whenLoaded('responsavelTecnico', fn () => $this->responsavelTecnico === null ? null : [
                'id' => $this->responsavelTecnico->id,
                'nome' => $this->responsavelTecnico->nome,
                'registro_profissional' => $this->responsavelTecnico->registro_profissional,
                'tipo_registro' => $this->responsavelTecnico->tipo_registro,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

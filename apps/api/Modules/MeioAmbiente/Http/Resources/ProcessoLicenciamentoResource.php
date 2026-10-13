<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;

/**
 * @mixin ProcessoLicenciamento
 * @property \Illuminate\Support\Carbon|null $created_at
 */
final class ProcessoLicenciamentoResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empreendimento_id' => $this->empreendimento_id,
            'fase' => $this->fase,
            'numero' => $this->numero,
            'exercicio' => $this->exercicio,
            'status' => $this->status,
            'data_deferimento' => $this->data_deferimento?->toDateString(),
            'validade_em' => $this->validade_em?->toDateString(),
            'condicionantes' => $this->whenLoaded('condicionantes', fn () => $this->condicionantes->map(fn ($c) => [
                'id' => $c->id,
                'descricao' => $c->descricao,
                'prazo' => $c->prazo->toDateString(),
                'situacao' => $c->situacao,
            ])),
            'documentos' => $this->whenLoaded('documentos', fn () => $this->documentos->map(fn ($d) => [
                'id' => $d->id,
                'tipo' => $d->tipo,
                'anexado_em' => $d->anexado_em->toIso8601String(),
            ])),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

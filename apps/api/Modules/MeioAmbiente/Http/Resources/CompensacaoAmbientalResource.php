<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Modules\MeioAmbiente\Models\CompensacaoAmbiental;

/** @mixin CompensacaoAmbiental */
final class CompensacaoAmbientalResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'empreendimento_id' => $this->empreendimento_id,
            'processo_licenciamento_id' => $this->processo_licenciamento_id,
            'percentual' => (float) $this->percentual,
            'valor_devido_centavos' => $this->valor_devido_centavos,
            'valor_pago_centavos' => $this->valorPagoCentavos(),
            'valor_destinado_centavos' => $this->valorDestinadoCentavos(),
            'saldo_devedor_centavos' => $this->saldoDevedorCentavos(),
            'pagamentos' => $this->whenLoaded('pagamentos', fn () => $this->pagamentos->map(fn ($p) => [
                'id' => $p->id,
                'valor_centavos' => $p->valor_centavos,
                'pago_em' => $p->pago_em->toDateString(),
                'comprovante' => $p->comprovante,
            ])),
            'destinacoes' => $this->whenLoaded('destinacoes', fn () => $this->destinacoes->map(fn ($d) => [
                'id' => $d->id,
                'destino' => $d->destino,
                'valor_centavos' => $d->valor_centavos,
                'registrada_em' => $d->registrada_em->toIso8601String(),
            ])),
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ParcelarMultaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.fiscalizacao.autuar') === true;
    }

    /**
     * O limite de parcelas (`ParcelamentoMulta::LIMITE_PARCELAS`) é regra de negócio,
     * verificada pelo Service (`RegraNegocioException` → 422) — não duplicada aqui.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'numero_parcelas' => ['required', 'integer', 'min:1'],
        ];
    }
}

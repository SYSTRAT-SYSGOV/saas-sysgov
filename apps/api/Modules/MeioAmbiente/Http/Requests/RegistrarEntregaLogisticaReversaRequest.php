<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegistrarEntregaLogisticaReversaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.residuos.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'quantidade_kg' => ['required', 'numeric'],
            'entregue_em' => ['nullable', 'date'],
        ];
    }
}

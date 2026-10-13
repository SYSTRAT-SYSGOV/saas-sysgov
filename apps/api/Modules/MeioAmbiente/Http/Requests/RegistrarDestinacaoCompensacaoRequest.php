<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\DestinacaoCompensacao;

final class RegistrarDestinacaoCompensacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.compensacao.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'destino' => ['required', Rule::in(DestinacaoCompensacao::DESTINOS_VALIDOS)],
            'valor_centavos' => ['required', 'integer', 'min:1'],
        ];
    }
}

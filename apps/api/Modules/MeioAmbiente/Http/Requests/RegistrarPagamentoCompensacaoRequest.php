<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegistrarPagamentoCompensacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.compensacao.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'valor_centavos' => ['required', 'integer', 'min:1'],
            'pago_em' => ['nullable', 'date'],
            'comprovante' => ['nullable', 'string', 'max:255'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportInspectionCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'numero_laudo' => ['required', 'string', 'max:50'],
            'orgao_emissor' => ['nullable', 'string', 'max:50'],
            'data_vistoria' => ['required', 'date'],
            'data_validade' => ['required', 'date', 'after:data_vistoria'],
            'resultado' => ['nullable', 'string', 'in:aprovado,reprovado,com_restricoes'],
            'observacoes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}

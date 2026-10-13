<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreVinculoRequest extends FormRequest
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
            'entidade_tipo' => [
                'required',
                'string',
                'max:64',
                'regex:/^[a-z][a-z0-9_]{1,63}$/',
            ],
            'entidade_id' => ['required', 'integer', 'min:1'],
            'papel_vinculo' => ['required', 'string', 'in:origem,anexo,referencia,apensamento'],
        ];
    }
}

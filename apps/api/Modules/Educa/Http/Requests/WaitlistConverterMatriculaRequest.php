<?php

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WaitlistConverterMatriculaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo_matricula' => ['nullable', 'string', 'max:50'],
            'data_matricula' => ['nullable', 'date'],
            'observacoes' => ['nullable', 'string', 'max:500'],
        ];
    }
}

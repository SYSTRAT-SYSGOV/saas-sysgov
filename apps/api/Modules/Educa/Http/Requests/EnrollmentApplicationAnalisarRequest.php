<?php

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EnrollmentApplicationAnalisarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', 'in:deferida,indeferida'],
            'motivo_indeferimento' => ['required_if:status,indeferida', 'nullable', 'string', 'max:500'],
            'documentos_conferidos' => ['nullable', 'array'],
            'criterios_confirmados' => ['nullable', 'array'],
        ];
    }
}

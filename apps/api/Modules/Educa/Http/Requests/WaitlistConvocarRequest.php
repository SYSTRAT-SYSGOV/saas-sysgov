<?php

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class WaitlistConvocarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dias_sla' => ['nullable', 'integer', 'min:1', 'max:30'],
            'observacoes' => ['nullable', 'string', 'max:500'],
        ];
    }
}

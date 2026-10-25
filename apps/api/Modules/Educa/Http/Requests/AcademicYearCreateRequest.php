<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AcademicYearCreateRequest extends FormRequest
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
            'ano' => ['required', 'integer', 'between:1900,2200'],
            'school_id' => ['nullable', 'uuid'],
            'copiar_do_ano_anterior' => ['nullable', 'boolean'],
            'ano_origem_id' => ['nullable', 'uuid', 'required_if:copiar_do_ano_anterior,true'],
            'observacoes' => ['nullable', 'string', 'max:500'],
        ];
    }
}

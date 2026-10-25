<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CalendarCreateRequest extends FormRequest
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
            'nome' => ['required', 'string', 'max:150'],
            'carga_horaria_diaria_minutos' => ['required', 'integer', 'between:1,720'],
        ];
    }
}

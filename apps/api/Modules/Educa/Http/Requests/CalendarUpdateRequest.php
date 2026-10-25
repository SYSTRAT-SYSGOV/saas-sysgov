<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CalendarUpdateRequest extends FormRequest
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
            'nome' => ['nullable', 'string', 'max:150'],
            'carga_horaria_diaria_minutos' => ['nullable', 'integer', 'between:1,720'],
            'forcar_republicacao' => ['nullable', 'boolean'],
        ];
    }
}

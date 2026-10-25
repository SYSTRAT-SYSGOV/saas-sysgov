<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CalendarDaysSaveRequest extends FormRequest
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
            'dias' => ['required', 'array', 'min:1', 'max:400'],
            'dias.*.data' => ['required', 'date'],
            'dias.*.motivo_id' => ['nullable', 'uuid'],
            'dias.*.descricao' => ['nullable', 'string', 'max:255'],
            'dias.*.carga_horaria_minutos' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

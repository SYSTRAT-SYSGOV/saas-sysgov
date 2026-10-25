<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CalendarEventCreateRequest extends FormRequest
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
            'data' => ['required', 'date_format:Y-m-d'],
            'titulo' => ['required', 'string', 'max:120'],
            'descricao' => ['nullable', 'string', 'max:1000'],
            'tipo_evento' => ['required', 'string', 'in:pedagogico,administrativo,comemorativo,reuniao,avaliacao'],
            'horario_inicio' => ['nullable', 'string', 'regex:/^[0-2][0-9]:[0-5][0-9]$/'],
            'horario_fim' => ['nullable', 'string', 'regex:/^[0-2][0-9]:[0-5][0-9]$/'],
        ];
    }
}

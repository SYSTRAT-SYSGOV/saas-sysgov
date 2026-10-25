<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TimetableSlotsSyncRequest extends FormRequest
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
            'slots' => ['required', 'array', 'min:1'],
            'slots.*.numero_tempo' => ['required', 'integer', 'min:1'],
            'slots.*.hora_inicio' => ['required', 'string'],
            'slots.*.hora_fim' => ['required', 'string'],
            'slots.*.tipo' => ['required', 'string', 'in:aula,intervalo,almoco,estudo_dirigido'],
            'slots.*.descricao' => ['nullable', 'string', 'max:80'],
        ];
    }
}

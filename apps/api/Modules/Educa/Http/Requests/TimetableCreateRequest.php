<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TimetableCreateRequest extends FormRequest
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
            'nome' => ['required', 'string', 'max:100'],
            'turno' => ['required', 'string', 'in:matutino,vespertino,noturno,integral'],
            'data_inicio_vigencia' => ['required', 'date'],
            'data_fim_vigencia' => ['nullable', 'date', 'after_or_equal:data_inicio_vigencia'],
        ];
    }
}

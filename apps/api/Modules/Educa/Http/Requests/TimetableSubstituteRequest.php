<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TimetableSubstituteRequest extends FormRequest
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
            'substitute_employee_id' => ['required', 'string', 'uuid'],
            'substituicao_inicio' => ['required', 'date'],
            'substituicao_fim' => ['required', 'date', 'after_or_equal:substituicao_inicio'],
            'substituicao_motivo' => ['nullable', 'string', 'max:255'],
        ];
    }
}

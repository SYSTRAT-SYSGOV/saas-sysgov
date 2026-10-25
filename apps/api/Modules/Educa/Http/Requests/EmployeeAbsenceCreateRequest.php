<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EmployeeAbsenceCreateRequest extends FormRequest
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
            'school_id' => ['required', 'uuid'],
            'data_falta' => ['required', 'date'],
            'tipo' => ['nullable', 'string', 'in:falta,atraso'],
            'minutos' => ['required', 'integer', 'min:1'],
            'justificada' => ['nullable', 'boolean'],
            'motivo_justificativa' => ['nullable', 'string', 'max:255'],
        ];
    }
}

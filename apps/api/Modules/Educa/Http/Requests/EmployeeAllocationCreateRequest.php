<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EmployeeAllocationCreateRequest extends FormRequest
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
            'employee_id' => ['required', 'uuid'],
            'school_id' => ['required', 'uuid'],
            'academic_year_id' => ['required', 'uuid'],
            'turno' => ['required', 'string', 'in:manha,tarde,noite,integral'],
            'dia_semana' => ['nullable', 'integer', 'between:1,7'],
            'horas_regencia' => ['required', 'numeric', 'min:0'],
            'horas_atividade' => ['required', 'numeric', 'min:0'],
            'horas_excedentes' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}

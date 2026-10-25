<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SchoolCapacityCreateRequest extends FormRequest
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
            'school_id' => ['required', 'string', 'uuid'],
            'academic_year_id' => ['required', 'string', 'uuid'],
            'course_id' => ['nullable', 'string', 'uuid'],
            'grade_id' => ['nullable', 'string', 'uuid'],
            'etapa_ensino' => ['required', 'string', 'max:50'],
            'turno' => ['required', 'string', 'in:matutino,vespertino,noturno,integral'],
            'quantidade_salas' => ['nullable', 'integer', 'min:1'],
            'vagas_totais' => ['required_without:capacidade_maxima_alunos', 'nullable', 'integer', 'min:0'],
            'capacidade_maxima_alunos' => ['required_without:vagas_totais', 'nullable', 'integer', 'min:0'],
            'vagas_reservadas' => ['nullable', 'integer', 'min:0'],
            'vagas_ocupadas' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

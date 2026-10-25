<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SchoolClassCreateRequest extends FormRequest
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
            'academic_year_id' => ['required', 'uuid'],
            'course_id' => ['required', 'uuid'],
            'grade_id' => ['required', 'uuid'],
            'matrix_id' => ['required', 'uuid'],
            'codigo' => ['nullable', 'string', 'max:30'],
            'nome' => ['required', 'string', 'max:80'],
            'sigla' => ['nullable', 'string', 'max:20'],
            'turno' => ['required', 'string', 'in:matutino,vespertino,noturno,integral'],
            'sala' => ['nullable', 'string', 'max:50'],
            'lotacao_maxima' => ['required', 'integer', 'min:1', 'max:100'],
            'tipo_atendimento' => ['nullable', 'string', 'in:regular,complementar,aee'],
            'is_multiseriada' => ['nullable', 'boolean'],
        ];
    }
}

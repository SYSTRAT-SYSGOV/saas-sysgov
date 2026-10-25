<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeeEnrollmentRequest extends FormRequest
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
            'student_profile_id' => ['required', 'string', 'uuid'],
            'regular_enrollment_id' => ['required', 'string', 'uuid'],
            'turno_atendimento' => ['required', 'string', 'in:manha,matutino,tarde,vespertino,noite,noturno'],
            'dias_semana' => ['nullable', 'array'],
            'horario_inicio' => ['nullable', 'string', 'max:10'],
            'horario_fim' => ['nullable', 'string', 'max:10'],
            'frequencia_semanal' => ['nullable', 'integer', 'min:1', 'max:5'],
        ];
    }
}

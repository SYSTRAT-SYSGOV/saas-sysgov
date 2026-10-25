<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TimetableLessonAllocateRequest extends FormRequest
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
            'timetable_slot_id' => ['required', 'string', 'uuid'],
            'dia_semana' => ['required', 'integer', 'between:1,7'],
            'curriculum_component_id' => ['required', 'string', 'uuid'],
            'teacher_employee_id' => ['required', 'string', 'uuid'],
            'substitute_employee_id' => ['nullable', 'string', 'uuid'],
        ];
    }
}

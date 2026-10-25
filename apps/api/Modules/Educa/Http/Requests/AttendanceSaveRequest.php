<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AttendanceSaveRequest extends FormRequest
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
            'registros' => ['required', 'array', 'min:1'],
            'registros.*.class_enrollment_id' => ['required', 'uuid', 'exists:educa_class_enrollments,id'],
            'registros.*.status' => ['required', 'string', 'in:presente,falta,falta_justificada'],
            'registros.*.justificativa' => ['nullable', 'string', 'max:255'],
        ];
    }
}

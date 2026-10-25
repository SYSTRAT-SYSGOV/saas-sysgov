<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StudentGradeSaveRequest extends FormRequest
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
            'etapa_sequencial' => ['required', 'integer', 'min:1', 'max:6'],
            'evaluation_rule_id' => ['nullable', 'uuid', 'exists:educa_evaluation_rules,id'],
            'notas' => ['required', 'array', 'min:1'],
            'notas.*.enrollment_id' => ['required', 'uuid', 'exists:educa_enrollments,id'],
            'notas.*.nota' => ['required', 'numeric', 'min:0', 'max:10'],
            'notas.*.nota_recuperacao' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'notas.*.parecer' => ['nullable', 'string', 'max:1000'],
        ];
    }
}

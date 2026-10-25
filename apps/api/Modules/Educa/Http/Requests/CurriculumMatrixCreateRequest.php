<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CurriculumMatrixCreateRequest extends FormRequest
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
            'course_id' => ['required', 'uuid'],
            'grade_id' => ['required', 'uuid'],
            'nome' => ['required', 'string', 'max:150'],
            'ano_vigencia' => ['required', 'integer'],
        ];
    }
}

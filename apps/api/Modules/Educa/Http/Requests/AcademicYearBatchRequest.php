<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AcademicYearBatchRequest extends FormRequest
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
            'acao' => ['required', 'string', 'in:create,open,close'],
            'ano' => ['required', 'integer', 'between:1900,2200'],
            'school_ids' => ['required', 'array', 'min:1'],
            'school_ids.*' => ['required', 'uuid'],
        ];
    }
}

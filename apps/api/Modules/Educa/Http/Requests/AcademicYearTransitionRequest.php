<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AcademicYearTransitionRequest extends FormRequest
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
            'evento' => ['required', 'string', 'in:start,freeze,resume,begin_evaluation,close'],
            'motivo' => ['nullable', 'string', 'max:255', 'required_if:evento,freeze'],
        ];
    }
}

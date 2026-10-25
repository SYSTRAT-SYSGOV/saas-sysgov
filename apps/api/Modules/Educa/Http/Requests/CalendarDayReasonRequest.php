<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CalendarDayReasonRequest extends FormRequest
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
            'school_id' => ['nullable', 'uuid'],
            'codigo' => ['required', 'string', 'max:20'],
            'nome' => ['required', 'string', 'max:100'],
            'tipo' => ['required', 'string', 'in:regular_school_day,extra_school_day,holiday,recess,pedagogical_planning'],
            'is_school_day' => ['required', 'boolean'],
            'color_hex' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class GradeCreateRequest extends FormRequest
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
            'sequencial' => ['required', 'integer', 'min:1'],
            'codigo' => ['required', 'string', 'max:20'],
            'nome' => ['required', 'string', 'max:50'],
            'carga_horaria_minima_anual' => ['required', 'integer', 'min:1'],
            'dias_letivos_minimos' => ['required', 'integer', 'min:1'],
        ];
    }
}

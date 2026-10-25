<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EmployeeUpdateRequest extends FormRequest
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
            'carga_horaria_semanal' => ['nullable', 'numeric', 'min:1', 'max:60'],
            'escolaridade' => ['nullable', 'string', 'max:50'],
            'codigo_inep_docente' => ['nullable', 'string', 'max:20'],
            'ativo' => ['nullable', 'boolean'],
        ];
    }
}

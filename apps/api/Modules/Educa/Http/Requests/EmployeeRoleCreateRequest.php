<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EmployeeRoleCreateRequest extends FormRequest
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
            'nome_funcao' => ['required', 'string', 'max:100'],
            'matricula' => ['required', 'string', 'max:50'],
            'is_docente' => ['nullable', 'boolean'],
        ];
    }
}

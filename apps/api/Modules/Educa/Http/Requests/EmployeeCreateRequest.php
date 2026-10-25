<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EmployeeCreateRequest extends FormRequest
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
            'pessoa_id' => ['required', 'integer'],
            'carga_horaria_semanal' => ['required', 'numeric', 'min:1', 'max:60'],
            'escolaridade' => ['nullable', 'string', 'max:50'],
            'codigo_inep_docente' => ['nullable', 'string', 'max:20'],
            'ativo' => ['nullable', 'boolean'],
            'funcoes' => ['nullable', 'array'],
            'funcoes.*.nome_funcao' => ['required_with:funcoes', 'string', 'max:100'],
            'funcoes.*.matricula' => ['required_with:funcoes', 'string', 'max:50'],
            'funcoes.*.is_docente' => ['nullable', 'boolean'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportDriverCreateRequest extends FormRequest
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
            'tipo_funcao' => ['required', 'string', 'in:motorista,monitor'],
            'cnh_numero' => ['nullable', 'string', 'max:30'],
            'cnh_categoria' => ['nullable', 'string', 'in:A,B,C,D,E,AB,AC,AD,AE'],
            'cnh_validade' => ['nullable', 'date'],
            'curso_transporte_escolar' => ['nullable', 'boolean'],
            'validade_curso' => ['nullable', 'date'],
            'ativo' => ['nullable', 'boolean'],
        ];
    }
}

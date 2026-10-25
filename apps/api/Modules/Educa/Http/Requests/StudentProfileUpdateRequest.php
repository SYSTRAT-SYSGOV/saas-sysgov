<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StudentProfileUpdateRequest extends FormRequest
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
            'codigo_nis' => ['nullable', 'string', 'max:20'],
            'cartao_sus' => ['nullable', 'string', 'max:20'],
            'bolsa_familia' => ['nullable', 'boolean'],
            'necessidades_especiais' => ['nullable', 'boolean'],
            'laudo_medico_aee' => ['nullable', 'string', 'max:255'],
            'transporte_escolar_publico' => ['nullable', 'boolean'],
            'certidao_nascimento_termo' => ['nullable', 'string', 'max:30'],
            'certidao_nascimento_livro' => ['nullable', 'string', 'max:20'],
            'certidao_nascimento_folha' => ['nullable', 'string', 'max:20'],
            'certidao_cartorio' => ['nullable', 'string', 'max:100'],
        ];
    }
}

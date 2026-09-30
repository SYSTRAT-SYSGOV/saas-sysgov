<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\PessoaVinculo;

final class StoreVinculoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'tipo_vinculo' => ['required', Rule::in(PessoaVinculo::TIPOS)],
            'matricula' => ['nullable', 'string', 'max:50'],
            'dados' => ['nullable', 'array'],
            'inicio' => ['nullable', 'date'],
            'fim' => ['nullable', 'date', 'after_or_equal:inicio'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'tipo_vinculo.required' => 'O tipo de vínculo é obrigatório.',
            'tipo_vinculo.in' => 'Tipo de vínculo inválido.',
            'fim.after_or_equal' => 'A data de término do vínculo deve ser posterior ou igual à data de início.',
        ];
    }
}

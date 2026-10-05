<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\PessoaSocio;

final class StoreSocioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'socio_pessoa_id' => ['required', 'integer', Rule::exists('pessoas', 'id')],
            'percentual_participacao' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'papel' => ['sometimes', Rule::in(PessoaSocio::PAPEIS)],
            'data_entrada' => ['nullable', 'date'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'socio_pessoa_id.required' => 'A pessoa sócia é obrigatória.',
            'socio_pessoa_id.exists' => 'A pessoa sócia informada não foi encontrada.',
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\PessoaDocumento;

final class StoreDocumentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(PessoaDocumento::TIPOS)],
            'numero' => ['required', 'string', 'max:50'],
            'orgao_emissor' => ['nullable', 'string', 'max:100'],
            'uf_emissao' => ['nullable', 'string', 'size:2'],
            'data_emissao' => ['nullable', 'date'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'tipo.required' => 'O tipo do documento é obrigatório.',
            'tipo.in' => 'Tipo de documento inválido (rg, cnh ou titulo_eleitor).',
            'numero.required' => 'O número do documento é obrigatório.',
        ];
    }
}

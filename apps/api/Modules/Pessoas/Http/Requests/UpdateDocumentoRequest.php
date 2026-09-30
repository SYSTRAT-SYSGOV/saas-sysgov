<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\PessoaDocumento;

final class UpdateDocumentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'tipo' => ['sometimes', Rule::in(PessoaDocumento::TIPOS)],
            'numero' => ['sometimes', 'string', 'max:50'],
            'orgao_emissor' => ['nullable', 'string', 'max:100'],
            'uf_emissao' => ['nullable', 'string', 'size:2'],
            'data_emissao' => ['nullable', 'date'],
        ];
    }
}

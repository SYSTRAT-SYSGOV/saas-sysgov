<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegularizarDocumentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return ['cpf' => ['required', 'string']];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['cpf.required' => 'O CPF é obrigatório para regularizar o documento.'];
    }
}

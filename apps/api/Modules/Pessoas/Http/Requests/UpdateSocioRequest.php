<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\PessoaSocio;

final class UpdateSocioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'percentual_participacao' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100'],
            'papel' => ['sometimes', Rule::in(PessoaSocio::PAPEIS)],
            'data_entrada' => ['sometimes', 'date'],
            'data_saida' => ['sometimes', 'nullable', 'date'],
        ];
    }
}

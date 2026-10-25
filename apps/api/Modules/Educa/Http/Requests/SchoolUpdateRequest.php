<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SchoolUpdateRequest extends FormRequest
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
            'codigo_inep' => ['nullable', 'string', 'max:8'],
            'sigla' => ['nullable', 'string', 'max:20'],
            'situacao_funcionamento' => ['nullable', 'string', 'in:em_atividade,paralisada,extinta'],
            'zona' => ['nullable', 'string', 'in:urbana,rural'],
            'regulamentada' => ['nullable', 'boolean'],
        ];
    }
}

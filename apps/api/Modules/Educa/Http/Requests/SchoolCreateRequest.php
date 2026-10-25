<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SchoolCreateRequest extends FormRequest
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
            'org_unit_id' => ['required', 'integer'],
            'codigo_inep' => ['nullable', 'string', 'max:8'],
            'sigla' => ['required', 'string', 'max:20'],
            'situacao_funcionamento' => ['required', 'string', 'in:em_atividade,paralisada,extinta'],
            'dependencia_administrativa' => ['required', 'string', 'in:municipal,estadual,federal,privada'],
            'zona' => ['required', 'string', 'in:urbana,rural'],
            'regulamentada' => ['nullable', 'boolean'],
        ];
    }
}

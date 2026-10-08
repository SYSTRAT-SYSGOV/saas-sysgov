<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\Empreendimento;

final class StoreEmpreendimentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.empreendimentos.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'titular_pessoa_id' => ['nullable', 'integer', 'exists:pessoas,id'],
            'cnpj' => ['nullable', 'digits:14'],
            'razao_social' => ['nullable', 'string', 'max:255', 'required_with:cnpj'],
            'atividade' => ['required', 'string', 'max:255'],
            'porte' => ['required', Rule::in(Empreendimento::PORTES_VALIDOS)],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }
}

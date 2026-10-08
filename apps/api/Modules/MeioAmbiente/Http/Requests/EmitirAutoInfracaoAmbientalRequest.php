<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\AutoInfracaoAmbiental;

final class EmitirAutoInfracaoAmbientalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.fiscalizacao.autuar') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'empreendimento_id' => ['required', 'integer', 'exists:meio_ambiente_empreendimentos,id'],
            'tipo_infracao' => ['required', Rule::in(AutoInfracaoAmbiental::TIPOS_VALIDOS)],
            'area_afetada_ha' => ['nullable', 'numeric', 'min:0'],
            'irregularidade' => ['nullable', 'string', 'max:1000'],
            'enquadramento_legal' => ['nullable', 'string', 'max:255'],
            'prazo_dias' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

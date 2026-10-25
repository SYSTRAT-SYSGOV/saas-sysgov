<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class DietaryRestrictionCreateRequest extends FormRequest
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
            'pessoa_id' => ['required'],
            'tipo_restricao' => ['required', 'string', 'in:alergia_alimentar,intolerancia,diabetes,doenca_celiaca,hipertensao,outra'],
            'alimento_alergeno' => ['required', 'string', 'max:255'],
            'severidade' => ['required', 'string', 'in:leve,moderada,grave_anafilaxia'],
            'sintomas_reacao' => ['nullable', 'string'],
            'conduta_emergencia' => ['nullable', 'string'],
            'requer_substituicao_especial' => ['nullable', 'boolean'],
            'alimento_substituto_recomendado' => ['nullable', 'string', 'max:255'],
            'laudo_medico_crm' => ['nullable', 'string', 'max:50'],
            'laudo_medico_emissor' => ['nullable', 'string', 'max:255'],
            'laudo_medico_data' => ['nullable', 'date'],
            'laudo_documento_url' => ['nullable', 'string', 'max:1000'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}

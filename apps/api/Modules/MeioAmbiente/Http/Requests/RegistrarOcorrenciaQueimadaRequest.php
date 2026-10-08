<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegistrarOcorrenciaQueimadaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.queimadas.registrar') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'data_ocorrencia' => ['required', 'date'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'area_queimada_ha' => ['nullable', 'numeric', 'min:0'],
            'responsavel_pessoa_id' => ['nullable', 'integer', 'exists:pessoas,id'],
            'responsavel_empreendimento_id' => ['nullable', 'integer', 'exists:meio_ambiente_empreendimentos,id'],
            'referencia_imagem_satelite' => ['nullable', 'array'],
            'referencia_imagem_satelite.fonte' => ['nullable', 'string', 'max:255'],
            'referencia_imagem_satelite.data_imagem' => ['nullable', 'date'],
            'referencia_imagem_satelite.identificador_externo' => ['nullable', 'string', 'max:255'],
        ];
    }
}

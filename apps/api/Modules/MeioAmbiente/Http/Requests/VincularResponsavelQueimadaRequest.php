<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class VincularResponsavelQueimadaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.queimadas.registrar') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'responsavel_pessoa_id' => ['nullable', 'integer', 'exists:pessoas,id'],
            'responsavel_empreendimento_id' => ['nullable', 'integer', 'exists:meio_ambiente_empreendimentos,id'],
            'execucao_vistoria_id' => ['nullable', 'integer'],
        ];
    }
}

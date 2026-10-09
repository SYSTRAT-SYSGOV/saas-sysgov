<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\MeioAmbiente\Http\Requests\Concerns\ExisteNoTenant;

final class VincularResponsavelQueimadaRequest extends FormRequest
{
    use ExisteNoTenant;

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.queimadas.registrar') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'responsavel_pessoa_id' => ['nullable', 'integer', $this->existeNoTenant('pessoas')],
            'responsavel_empreendimento_id' => ['nullable', 'integer', $this->existeNoTenant('meio_ambiente_empreendimentos')],
            'execucao_vistoria_id' => ['nullable', 'integer'],
        ];
    }
}

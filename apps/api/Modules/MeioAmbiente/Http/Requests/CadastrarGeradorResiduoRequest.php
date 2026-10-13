<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Http\Requests\Concerns\ExisteNoTenant;
use Modules\MeioAmbiente\Models\GeradorResiduo;

final class CadastrarGeradorResiduoRequest extends FormRequest
{
    use ExisteNoTenant;

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.residuos.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'nome' => ['nullable', 'string', 'max:255'],
            'tipo' => ['required', Rule::in(GeradorResiduo::TIPOS_VALIDOS)],
            'pessoa_id' => ['nullable', 'integer', $this->existeNoTenant('pessoas')],
            'empreendimento_id' => ['nullable', 'integer', $this->existeNoTenant('meio_ambiente_empreendimentos')],
        ];
    }
}

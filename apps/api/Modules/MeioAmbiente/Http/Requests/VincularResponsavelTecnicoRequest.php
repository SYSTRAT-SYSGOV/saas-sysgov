<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Http\Requests\Concerns\ExisteNoTenant;
use Modules\MeioAmbiente\Models\ResponsavelTecnico;

final class VincularResponsavelTecnicoRequest extends FormRequest
{
    use ExisteNoTenant;

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.empreendimentos.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'pessoa_id' => ['nullable', 'integer', $this->existeNoTenant('pessoas')],
            'nome' => ['required', 'string', 'max:255'],
            'registro_profissional' => ['required', 'string', 'max:50'],
            'tipo_registro' => ['required', Rule::in(ResponsavelTecnico::TIPOS_VALIDOS)],
        ];
    }
}

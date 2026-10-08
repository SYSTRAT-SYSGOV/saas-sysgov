<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\AreaProtegida;

final class CadastrarAreaProtegidaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.areas_protegidas.manage') === true;
    }

    /**
     * A validade geométrica propriamente dita (tipo/anel com vértices suficientes) é
     * regra de negócio verificada pelo Service (`RegraNegocioException` → 422).
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(AreaProtegida::TIPOS_VALIDOS)],
            'subtipo' => ['nullable', 'string', 'max:30'],
            'geometria' => ['required', 'array'],
            'ato_legal' => ['nullable', 'string', 'max:255'],
        ];
    }
}

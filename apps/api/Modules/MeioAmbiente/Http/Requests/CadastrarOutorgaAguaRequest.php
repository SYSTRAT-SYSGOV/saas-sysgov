<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\OutorgaAgua;

final class CadastrarOutorgaAguaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.recursos_hidricos.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'tipo_captacao' => ['required', Rule::in(OutorgaAgua::TIPOS_CAPTACAO_VALIDOS)],
            'vazao_m3_hora' => ['required', 'numeric', 'min:0'],
            'finalidade' => ['required', Rule::in(OutorgaAgua::FINALIDADES_VALIDAS)],
        ];
    }
}

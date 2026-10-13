<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CadastrarLicencaEfluenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.recursos_hidricos.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'parametros' => ['required', 'array', 'min:1'],
            'parametros.*.parametro' => ['required', 'string', 'max:30'],
            'parametros.*.limite_min' => ['nullable', 'numeric'],
            'parametros.*.limite_max' => ['nullable', 'numeric'],
            'parametros.*.unidade' => ['nullable', 'string', 'max:20'],
        ];
    }
}

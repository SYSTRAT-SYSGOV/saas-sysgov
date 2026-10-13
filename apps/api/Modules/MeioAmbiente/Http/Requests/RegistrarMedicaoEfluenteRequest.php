<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegistrarMedicaoEfluenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.recursos_hidricos.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'valor' => ['required', 'numeric'],
            'medida_em' => ['nullable', 'date'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\VistoriaTecnicaLicenciamento;

final class RegistrarVistoriaTecnicaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.licenciamento.vistoriar') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'resultado' => ['required', Rule::in([
                VistoriaTecnicaLicenciamento::RESULTADO_FAVORAVEL,
                VistoriaTecnicaLicenciamento::RESULTADO_DESFAVORAVEL,
            ])],
            'parecer' => ['nullable', 'string', 'max:2000'],
        ];
    }
}

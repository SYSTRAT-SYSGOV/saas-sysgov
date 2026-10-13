<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\ProcessoLicenciamento;

final class AbrirProcessoLicenciamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.licenciamento.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'fase' => ['required', Rule::in(ProcessoLicenciamento::FASES_VALIDAS)],
        ];
    }
}

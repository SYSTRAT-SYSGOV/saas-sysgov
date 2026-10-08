<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AnexarDocumentoLicenciamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('meio_ambiente.licenciamento.manage') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'tipo' => ['required', 'string', 'max:30'],
            'arquivo' => ['nullable', 'file', 'max:20480'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeeLaudoCreateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'cid10_codigo' => ['required', 'string', 'max:20'],
            'cid11_codigo' => ['nullable', 'string', 'max:20'],
            'diagnostico_descricao' => ['nullable', 'string'],
            'laudo_medico_url' => ['nullable', 'string', 'max:255'],
            'emitido_em' => ['required', 'date'],
            'expira_em' => ['nullable', 'date'],
            'profissional_emissor' => ['required', 'string', 'max:150'],
            'registro_profissional' => ['required', 'string', 'max:50'],
        ];
    }
}

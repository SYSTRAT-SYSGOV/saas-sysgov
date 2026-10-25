<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class IncidentActionCreateRequest extends FormRequest
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
            'tipo_acao' => ['required', 'string', 'max:100'],
            'descricao' => ['required', 'string'],
            'exige_comparecimento' => ['nullable', 'boolean'],
            'data_acao' => ['nullable', 'date'],
        ];
    }
}

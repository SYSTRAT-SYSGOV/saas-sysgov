<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AcademicStageReplaceRequest extends FormRequest
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
            'tipo_etapa_id' => ['required', 'uuid'],
            'etapas' => ['required', 'array', 'min:1'],
            'etapas.*.sequencial' => ['required', 'integer', 'min:1'],
            'etapas.*.nome' => ['required', 'string', 'max:50'],
            'etapas.*.data_inicio' => ['required', 'date'],
            'etapas.*.data_fim' => ['required', 'date', 'after_or_equal:etapas.*.data_inicio'],
            'etapas.*.dias_letivos' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

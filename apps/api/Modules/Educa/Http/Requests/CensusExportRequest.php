<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CensusExportRequest extends FormRequest
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
            'school_id' => ['required', 'uuid'],
            'academic_year_id' => ['required', 'uuid'],
            'etapa_censo' => ['nullable', 'string', 'in:matricula_inicial,situacao_aluno'],
        ];
    }
}

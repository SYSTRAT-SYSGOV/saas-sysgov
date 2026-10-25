<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CurriculumMatrixComponentsRequest extends FormRequest
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
            'componentes' => ['required', 'array', 'min:1'],
            'componentes.*.component_id' => ['required', 'uuid'],
            'componentes.*.horas_semanais' => ['required', 'integer', 'min:1'],
            'componentes.*.horas_anuais' => ['required', 'integer', 'min:1'],
            'componentes.*.tipo_nota' => ['required', 'string', 'in:numerica,conceitual,parecer'],
        ];
    }
}

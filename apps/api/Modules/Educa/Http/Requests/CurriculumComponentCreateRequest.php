<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CurriculumComponentCreateRequest extends FormRequest
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
            'knowledge_area_id' => ['required', 'uuid'],
            'codigo' => ['required', 'string', 'max:30'],
            'codigo_educacenso_inep' => ['nullable', 'string', 'max:10'],
            'nome' => ['required', 'string', 'max:100'],
            'sigla' => ['required', 'string', 'max:10'],
            'base_curricular' => ['required', 'string', 'in:nacional_comum,diversificada,profissional,ensino_religioso'],
            'desconsiderar_progressao' => ['nullable', 'boolean'],
            'color_hex' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ];
    }
}

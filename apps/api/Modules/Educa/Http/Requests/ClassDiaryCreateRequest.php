<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ClassDiaryCreateRequest extends FormRequest
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
            'school_class_id' => ['required', 'uuid', 'exists:educa_school_classes,id'],
            'curriculum_component_id' => ['required', 'uuid', 'exists:educa_curriculum_components,id'],
            'data_aula' => ['required', 'date'],
            'quantidade_aulas' => ['required', 'integer', 'min:1', 'max:10'],
            'conteudo' => ['required', 'string', 'max:2000'],
            'habilidades_bncc' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'string', 'in:rascunho,publicado'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class PreConselhoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'cronograma_id' => ['required', 'uuid', 'exists:educa_conselho_cronogramas,id'],
            'school_class_id' => ['required', 'uuid', 'exists:educa_school_classes,id'],
            'curriculum_component_id' => ['required', 'uuid', 'exists:educa_curriculum_components,id'],
            'professor_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'periodo' => ['nullable', 'string', 'max:50'],
            'desempenho_geral_turma' => ['required', 'string', 'in:excelente,bom,regular,insatisfatorio'],
            'objetivos_atingidos_percentual' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'metodologias_utilizadas' => ['nullable', 'array'],
            'metodologias_utilizadas.*' => ['string'],
            'dificuldades_detectadas' => ['nullable', 'string'],
            'acoes_intervencao_sugeridas' => ['nullable', 'string'],
        ];
    }
}

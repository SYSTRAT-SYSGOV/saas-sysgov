<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ConselhoDeliberacaoAlunoRequest extends FormRequest
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
            'enrollment_id' => ['required', 'uuid', 'exists:educa_enrollments,id'],
            'resultado_deliberacao' => ['required', 'string', 'in:progressao_plena,progressao_dependencia,recuperacao_intensiva,retencao'],
            'parecer_descritivo' => ['nullable', 'string'],
            'disciplinas_dependencia' => ['nullable', 'array'],
            'disciplinas_dependencia.*' => ['string'],
            'encaminhamento_pedagogico' => ['nullable', 'string'],
        ];
    }
}

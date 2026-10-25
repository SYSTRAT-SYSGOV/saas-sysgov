<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class PreConselhoAlunoRequest extends FormRequest
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
            'nivel_atencao' => ['required', 'string', 'in:baixo,medio,alto,critico'],
            'motivo_atencao' => ['required', 'string', 'in:rendimento_baixo,faltas_excessivas,comportamento,socioemocional,outro'],
            'detalhes' => ['nullable', 'string'],
            'encaminhamentos' => ['nullable', 'string'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EnrollmentApplicationCreateRequest extends FormRequest
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
            'academic_year_id' => ['required', 'string', 'uuid'],
            'candidato_pessoa_id' => ['required'],
            'responsavel_pessoa_id' => ['required'],
            'etapa_ensino' => ['required', 'string', 'max:50'],
            'turno_preferencial' => ['nullable', 'string', 'in:matutino,vespertino,noturno,integral'],
            'escola_preferencia_1_id' => ['required', 'string', 'uuid'],
            'escola_preferencia_2_id' => ['nullable', 'string', 'uuid'],
            'escola_preferencia_3_id' => ['nullable', 'string', 'uuid'],
            'criterio_pcd' => ['nullable', 'boolean'],
            'criterio_bolsa_familia' => ['nullable', 'boolean'],
            'criterio_mae_trabalhadora' => ['nullable', 'boolean'],
            'criterio_irmao_escola' => ['nullable', 'boolean'],
            'criterio_zoneamento' => ['nullable', 'boolean'],
        ];
    }
}

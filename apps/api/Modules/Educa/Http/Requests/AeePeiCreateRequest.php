<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeePeiCreateRequest extends FormRequest
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
            'student_profile_id' => ['required', 'string', 'uuid'],
            'academic_year_id' => ['nullable', 'string', 'uuid'],
            'ano_letivo' => ['nullable', 'integer'],
            'semestre' => ['required', 'integer', 'in:1,2'],
            'habilidades_atuais' => ['nullable', 'string'],
            'necessidades_especificas' => ['nullable', 'string'],
            'adequacoes_curriculares' => ['nullable', 'string'],
            'adaptacoes_avaliativas' => ['nullable', 'string'],
            'metodologias_especificas' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:rascunho,ativo,revisado,concluido'],
        ];
    }
}

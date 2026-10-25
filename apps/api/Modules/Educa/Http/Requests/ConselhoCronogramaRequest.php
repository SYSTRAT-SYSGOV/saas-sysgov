<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ConselhoCronogramaRequest extends FormRequest
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
        $isPost = $this->isMethod('POST');

        return [
            'school_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:educa_schools,id'],
            'academic_year_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:educa_academic_years,id'],
            'ano_letivo' => [$isPost ? 'required' : 'sometimes', 'integer'],
            'periodo' => [$isPost ? 'required' : 'sometimes', 'string', 'max:50'],
            'data_inicio_pre_conselho' => [$isPost ? 'required' : 'sometimes', 'date'],
            'data_fim_pre_conselho' => [$isPost ? 'required' : 'sometimes', 'date'],
            'data_reuniao_conselho' => [$isPost ? 'required' : 'sometimes', 'date'],
            'status' => ['sometimes', 'string', 'in:agendado,em_andamento,concluido,cancelado'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}

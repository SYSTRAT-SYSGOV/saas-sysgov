<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeeSupportAllocationRequest extends FormRequest
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
            'school_id' => ['required', 'string', 'uuid'],
            'caregiver_employee_id' => ['required', 'string', 'uuid'],
            'tipo_apoio' => ['required', 'string', 'in:cuidador_alimentacao_higiene,interprete_libras,guia_interprete,mediador_pedagogico'],
            'turno' => ['required', 'string', 'in:manha,matutino,tarde,vespertino,integral'],
            'carga_horaria_semanal' => ['nullable', 'integer', 'min:1', 'max:44'],
            'data_inicio' => ['required', 'date'],
            'data_fim' => ['nullable', 'date'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}

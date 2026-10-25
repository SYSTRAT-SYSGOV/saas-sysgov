<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeeResourceRoomCreateRequest extends FormRequest
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
            'school_id' => ['required', 'string', 'uuid'],
            'nome' => ['required', 'string', 'max:100'],
            'tipo_sala' => ['nullable', 'string', 'in:tipo_1_generica,tipo_2_surdez_cegueira,polo_municipal'],
            'capacidade_atendimento' => ['nullable', 'integer', 'min:1'],
            'equipamentos_disponiveis' => ['nullable', 'array'],
            'horarios_disponiveis' => ['nullable', 'array'],
            'is_polo' => ['nullable', 'boolean'],
        ];
    }
}

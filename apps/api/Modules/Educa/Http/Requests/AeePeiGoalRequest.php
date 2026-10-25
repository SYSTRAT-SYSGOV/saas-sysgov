<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AeePeiGoalRequest extends FormRequest
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
            'goal_id' => ['nullable', 'string', 'uuid'],
            'area_desenvolvimento' => ['required', 'string', 'in:cognitiva,comunicacao_linguagem,socioemocional,psicomotora,autonomia_vida_diaria'],
            'objetivo' => ['required', 'string'],
            'estrategias' => ['nullable', 'string'],
            'recursos' => ['nullable', 'string'],
            'indicadores_sucesso' => ['nullable', 'string'],
            'prazo_previsto' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:em_andamento,atingido,parcialmente_atingido,cancelado'],
            'avaliacao_resultado' => ['nullable', 'string'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MealLogCreateRequest extends FormRequest
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
            'data_consumo' => ['required', 'date'],
            'tipo_refeicao' => ['required', 'string', 'in:desjejum,lanche_manha,almoco,lanche_tarde,jantar'],
            'total_previsto' => ['required', 'integer', 'min:0'],
            'total_servido' => ['required', 'integer', 'min:0'],
            'sobra_limpa_kg' => ['nullable', 'numeric', 'min:0'],
            'resto_ingesta_kg' => ['nullable', 'numeric', 'min:0'],
            'menu_id' => ['nullable', 'string', 'uuid'],
            'temperatura_servico_celsius' => ['nullable', 'numeric', 'between:0,100'],
            'observacoes' => ['nullable', 'string'],
        ];
    }
}

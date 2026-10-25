<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MenuItemCreateRequest extends FormRequest
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
            'dia_semana' => ['required', 'integer', 'between:1,7'],
            'nome_preparacao' => ['required', 'string', 'max:255'],
            'ingredientes' => ['nullable', 'string'],
            'medida_caseira' => ['nullable', 'string', 'max:100'],
            'porcao_gramas' => ['required', 'numeric', 'min:0'],
            'calorias_kcal' => ['required', 'numeric', 'min:0'],
            'carboidratos_g' => ['required', 'numeric', 'min:0'],
            'proteinas_g' => ['required', 'numeric', 'min:0'],
            'lipidios_g' => ['required', 'numeric', 'min:0'],
            'fibras_g' => ['nullable', 'numeric', 'min:0'],
            'sodio_mg' => ['nullable', 'numeric', 'min:0'],
            'alergenos' => ['nullable', 'array'],
            'alergenos.*' => ['string'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MenuCreateRequest extends FormRequest
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
            'nome' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'etapa_ensino' => ['required', 'string', 'in:creche,infantil,fundamental,medio,eja,integral'],
            'tipo_refeicao' => ['required', 'string', 'in:desjejum,lanche_manha,almoco,lanche_tarde,jantar'],
            'periodo' => ['required', 'string', 'in:semanal,quinzenal,mensal'],
            'vigencia_inicio' => ['required', 'date'],
            'vigencia_fim' => ['required', 'date', 'after_or_equal:vigencia_inicio'],
            'school_id' => ['nullable', 'uuid'],
            'itens' => ['nullable', 'array'],
            'itens.*.dia_semana' => ['required_with:itens', 'integer', 'between:1,7'],
            'itens.*.nome_preparacao' => ['required_with:itens', 'string', 'max:255'],
            'itens.*.ingredientes' => ['nullable', 'string'],
            'itens.*.medida_caseira' => ['nullable', 'string', 'max:100'],
            'itens.*.porcao_gramas' => ['required_with:itens', 'numeric', 'min:0'],
            'itens.*.calorias_kcal' => ['required_with:itens', 'numeric', 'min:0'],
            'itens.*.carboidratos_g' => ['required_with:itens', 'numeric', 'min:0'],
            'itens.*.proteinas_g' => ['required_with:itens', 'numeric', 'min:0'],
            'itens.*.lipidios_g' => ['required_with:itens', 'numeric', 'min:0'],
            'itens.*.fibras_g' => ['nullable', 'numeric', 'min:0'],
            'itens.*.sodio_mg' => ['nullable', 'numeric', 'min:0'],
            'itens.*.alergenos' => ['nullable', 'array'],
            'itens.*.alergenos.*' => ['string'],
        ];
    }
}

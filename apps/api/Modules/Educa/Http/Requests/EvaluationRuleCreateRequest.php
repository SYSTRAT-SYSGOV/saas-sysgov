<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EvaluationRuleCreateRequest extends FormRequest
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
            'nome' => ['required', 'string', 'max:100'],
            'tipo_nota' => ['required', 'string', 'in:numerica,conceitual,parecer'],
            'nota_maxima' => ['nullable', 'numeric', 'min:1'],
            'nota_minima_aprovacao' => ['nullable', 'numeric', 'min:0'],
            'formula_media_anual' => ['required', 'string', 'max:255'],
            'formula_recuperacao' => ['nullable', 'string', 'max:255'],
            'formula_exame_final' => ['nullable', 'string', 'max:255'],
            'nota_minima_exame' => ['nullable', 'numeric', 'min:0'],
            'ativo' => ['nullable', 'boolean'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Cemiterios\Support\ViaSucessao;

final class AbrirSucessaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('cemiterios.sucessao.manage');
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'concession_id' => ['required', 'integer', 'exists:concessions,id'],
            'park_id' => ['nullable', 'integer', 'exists:parks,id'],
            'plot_id' => ['nullable', 'integer', 'exists:plots,id'],
            'via' => ['required', 'string', 'in:' . implode(',', array_map(fn (ViaSucessao $v) => $v->value, ViaSucessao::cases()))],
            'requerente_id' => ['nullable', 'integer', 'exists:users,id'],
            'titular_falecido_id' => ['nullable', 'integer', 'exists:concession_holders,id'],
            'data_falecimento' => ['nullable', 'date'],
            'processo_referencia' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'concession_id.required' => 'O ID da concessão é obrigatório.',
            'concession_id.exists' => 'A concessão informada não existe.',
            'via.required' => 'A via de sucessão é obrigatória.',
            'via.in' => 'Via de sucessão inválida.',
        ];
    }
}
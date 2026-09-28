<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AtualizarSucessaoRequest extends FormRequest
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
            'park_id' => ['nullable', 'integer', 'exists:parks,id'],
            'plot_id' => ['nullable', 'integer', 'exists:plots,id'],
            'requerente_id' => ['nullable', 'integer', 'exists:users,id'],
            'titular_falecido_id' => ['nullable', 'integer', 'exists:concession_holders,id'],
            'data_falecimento' => ['nullable', 'date'],
            'processo_referencia' => ['nullable', 'string', 'max:50'],
            'parecer' => ['nullable', 'string'],
            'lock_version' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'lock_version.required' => 'A versão do registro é obrigatória para concorrência otimista.',
        ];
    }
}
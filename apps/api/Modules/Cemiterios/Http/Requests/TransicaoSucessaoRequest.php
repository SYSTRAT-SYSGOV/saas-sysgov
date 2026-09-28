<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Cemiterios\Support\EstadoSucessao;

final class TransicaoSucessaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('cemiterios.sucessao.transition');
    }

    /**
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'para' => ['required', 'string', 'in:' . implode(',', array_map(fn (EstadoSucessao $e) => $e->value, EstadoSucessao::cases()))],
            'motivo' => ['required', 'string', 'min:10'],
            'lock_version' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'para.required' => 'O estado de destino é obrigatório.',
            'para.in' => 'Estado de destino inválido.',
            'motivo.required' => 'O motivo/parecer é obrigatório.',
            'motivo.min' => 'O motivo deve ter pelo menos 10 caracteres.',
            'lock_version.required' => 'A versão do registro é obrigatória para concorrência otimista.',
        ];
    }
}
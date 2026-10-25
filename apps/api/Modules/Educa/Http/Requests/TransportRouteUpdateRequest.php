<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportRouteUpdateRequest extends FormRequest
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
            'nome' => ['nullable', 'string', 'max:100'],
            'turno' => ['nullable', 'string', 'in:matutino,vespertino,noturno,integral'],
            'tipo_rota' => ['nullable', 'string', 'in:urbana,rural,mista'],
            'quilometragem_estimada' => ['nullable', 'numeric', 'min:0'],
            'horario_saida' => ['nullable', 'string', 'max:10'],
            'horario_chegada' => ['nullable', 'string', 'max:10'],
            'ativo' => ['nullable', 'boolean'],
        ];
    }
}

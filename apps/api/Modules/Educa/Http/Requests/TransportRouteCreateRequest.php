<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportRouteCreateRequest extends FormRequest
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
            'codigo' => ['required', 'string', 'max:30'],
            'nome' => ['required', 'string', 'max:100'],
            'turno' => ['required', 'string', 'in:matutino,vespertino,noturno,integral'],
            'tipo_rota' => ['required', 'string', 'in:urbana,rural,mista'],
            'quilometragem_estimada' => ['nullable', 'numeric', 'min:0'],
            'horario_saida' => ['nullable', 'string', 'max:10'],
            'horario_chegada' => ['nullable', 'string', 'max:10'],
        ];
    }
}

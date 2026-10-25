<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportVehicleCreateRequest extends FormRequest
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
            'placa' => ['required', 'string', 'max:10'],
            'renavam' => ['nullable', 'string', 'max:20'],
            'marca_modelo' => ['required', 'string', 'max:100'],
            'ano_fabricacao' => ['required', 'integer', 'min:1900', 'max:2100'],
            'tipologia' => ['required', 'string', 'in:onibus,microonibus,van,embarcacao,outros'],
            'tipo_propriedade' => ['required', 'string', 'in:proprio,terceirizado'],
            'capacidade_passageiros' => ['required', 'integer', 'min:1', 'max:150'],
            'status' => ['nullable', 'string', 'in:regular,em_manutencao,interditado'],
        ];
    }
}

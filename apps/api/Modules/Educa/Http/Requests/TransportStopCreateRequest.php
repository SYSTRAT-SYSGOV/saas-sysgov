<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportStopCreateRequest extends FormRequest
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
            'ordem' => ['nullable', 'integer', 'min:1'],
            'nome' => ['required', 'string', 'max:100'],
            'referencia' => ['nullable', 'string', 'max:255'],
            'latitude' => ['nullable', 'numeric'],
            'longitude' => ['nullable', 'numeric'],
            'horario_estimado' => ['nullable', 'string', 'max:10'],
        ];
    }
}

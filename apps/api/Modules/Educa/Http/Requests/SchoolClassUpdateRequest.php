<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SchoolClassUpdateRequest extends FormRequest
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
            'nome' => ['nullable', 'string', 'max:80'],
            'sigla' => ['nullable', 'string', 'max:20'],
            'sala' => ['nullable', 'string', 'max:50'],
            'lotacao_maxima' => ['nullable', 'integer', 'min:1', 'max:100'],
            'status' => ['nullable', 'string', 'in:ativa,inativa'],
        ];
    }
}

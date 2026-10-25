<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class KnowledgeAreaCreateRequest extends FormRequest
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
            'nome' => ['required', 'string', 'max:60'],
            'secao' => ['nullable', 'string', 'max:50'],
            'ordem' => ['nullable', 'integer'],
        ];
    }
}

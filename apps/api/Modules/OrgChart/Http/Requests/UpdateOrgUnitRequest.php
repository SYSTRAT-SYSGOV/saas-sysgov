<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateOrgUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:50'],
            'acronym' => ['nullable', 'string', 'max:30'],
            'type' => ['sometimes', 'required', 'string', 'in:raiz,secretaria,departamento,divisao,setor,autarquia,fundacao'],
            'order' => ['nullable', 'integer', 'min:0'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}

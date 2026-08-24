<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class CreateOrgUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Controlado via Policy no Controller
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:50'],
            'acronym' => ['nullable', 'string', 'max:30'],
            'type' => ['required', 'string', 'in:raiz,secretaria,departamento,divisao,setor,autarquia,fundacao'],
            'parent_id' => ['nullable', 'integer', 'exists:org_units,id'],
            'order' => ['nullable', 'integer', 'min:0'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}

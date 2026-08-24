<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MoveOrgUnitRequest extends FormRequest
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
            'new_parent_id' => ['nullable', 'integer', 'exists:org_units,id'],
            'new_order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LinkUserOrgUnitRequest extends FormRequest
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
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['required', 'string', 'in:responsavel,membro'],
            'is_primary' => ['nullable', 'boolean'],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'metadata' => ['nullable', 'array'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace Modules\OrgChart\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class InactivateOrgUnitRequest extends FormRequest
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
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ];
    }
}

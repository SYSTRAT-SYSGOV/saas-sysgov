<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportRouteSchoolsRequest extends FormRequest
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
            'school_ids' => ['required', 'array', 'min:1'],
            'school_ids.*' => ['required', 'uuid'],
        ];
    }
}

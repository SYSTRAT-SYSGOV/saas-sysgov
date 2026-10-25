<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class EnrollmentCancelRequest extends FormRequest
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
            'data_cancelamento' => ['required', 'date_format:Y-m-d'],
            'justificativa' => ['required', 'string', 'max:500'],
        ];
    }
}

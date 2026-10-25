<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class InfrequenceAlertRequest extends FormRequest
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
            'enrollment_id' => ['required', 'uuid'],
            'total_faltas' => ['required', 'integer', 'min:1'],
            'canal' => ['nullable', 'string', 'in:whatsapp,sms,email,todos'],
        ];
    }
}

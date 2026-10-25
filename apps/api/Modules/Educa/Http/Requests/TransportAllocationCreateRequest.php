<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class TransportAllocationCreateRequest extends FormRequest
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
            'route_id' => ['required', 'uuid'],
            'vehicle_id' => ['required', 'uuid'],
            'stop_id' => ['required', 'uuid'],
            'enrollment_id' => ['required', 'uuid'],
            'data_inicio' => ['required', 'date'],
        ];
    }
}

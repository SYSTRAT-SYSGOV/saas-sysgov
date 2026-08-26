<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class DeactivateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->is_platform_admin
            || $user?->hasPermission('users.systrat.delete')
            || $user?->hasPermission('users.deactivate') ?? false;
    }

    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'reason.required' => 'O motivo da desativação é obrigatório.',
            'reason.min' => 'O motivo deve ter no mínimo 10 caracteres.',
        ];
    }
}
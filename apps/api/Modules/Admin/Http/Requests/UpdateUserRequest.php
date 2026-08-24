<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;
        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email', 'max:160', 'unique:users,email,'.$userId],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'is_platform_admin' => ['nullable', 'boolean'],
            'tenants' => ['nullable', 'array'],
            'tenants.*.tenant_id' => ['required_with:tenants', 'integer', 'exists:tenants,id'],
            'tenants.*.role_id' => ['nullable', 'integer', 'exists:roles,id'],
        ];
    }
}
